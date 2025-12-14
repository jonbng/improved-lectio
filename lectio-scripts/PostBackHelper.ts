/// <reference types="microsoft-ajax"/>
/// <reference types="signalr"/>

import { LectioCookie } from "./LectioCookie";
import { SessionHelper } from "./SessionHelper";
import { JSErrorHandling } from "./JSErrorHandling";
import { IAspNetForm } from "./Globals";
import { LectioDeferred, LectioJSUtils, LectioKeyCode, LectioPageOps } from "./lectiolib";
import morphdom from 'morphdom';

export namespace PostBackHelper {

	let msg = "Der arbejdes...";
	let timeout = 2000;
	let localTempEvent: Event | null = null;
	let postBackDepth = 0;
	let activePostbackOrNavigation: {
		completion: LectioDeferred<undefined>;
		isSubmit: boolean,
	} | undefined;

	export function IsPerformingPostBack() {
		return postBackDepth > 0;
	}

	export const NotificationReceived: LectioDeferred<undefined> = LectioJSUtils.CreateDeferred();

	export function PostbackHasStarted(): boolean { return !!activePostbackOrNavigation && activePostbackOrNavigation.isSubmit; };

	export function Customize(customTimeout: number, customMsg: string): void {
		if (customTimeout != null)
			timeout = customTimeout;
		if (customMsg != null)
			msg = customMsg;
	}

	export function morph(v1: Node, v2: string | Node): any {
		const rv = morphdom(v1, v2, {
			onBeforeElUpdated: (fromEl, toEl) => {
				// spec - https://dom.spec.whatwg.org/#concept-node-equals
				const eq = fromEl.isEqualNode(toEl);
				return !eq;
			},
		});
		return rv;
	}

	export function LatestSubmitEnded(error?: { status: 'error', info: string | {} }): void {
		if (!activePostbackOrNavigation)
			return;
		const tmp = activePostbackOrNavigation;
		activePostbackOrNavigation = undefined;
		if (error?.status === 'error')
			tmp.completion.reject(error.info);
		else
			tmp.completion.resolve(undefined);
	}

	function SubmitOrNavigationStarted(
		dopostbackprogress: boolean,
		showpostbackcancelbtn: boolean,
		showpostbackapplybtn: boolean,
		postbackId: string,
		isSubmit: boolean): Promise<undefined> {
		const pbnotifyCookieName = 'pbnotify';

		// Denne håndterer også updatepanel, og her kan der (også) startes nye
		// postbacks/opdateringer.

		let prevDialog: JQuery | undefined;
		function showSlowPostBackDialog(): JQueryPromise<undefined> | undefined {
			if (postbackOrNavigation.completion.isSettled())
				return undefined;

			const cookie = LectioCookie.getCookie(pbnotifyCookieName);
			if (cookie !== null && cookie !== undefined) {
				postbackOrNavigation.completion.resolve(undefined);
				NotificationReceived.resolve(undefined);
				return undefined;
			}

			prevDialog = $("<div class=textCenter><p class='infoTextItalic'>" + postbackOrNavigation.msg + "</p></div>").
				appendTo('body').
				append($("<div />").progressbar({ value: 100 })).
				dialog({ title: "Vent venligst", resizable: false });

			if (dopostbackprogress && postbackId && $.connection) {
				msg = "";
				prevDialog.append($("<div data-tag=\"dialogcontent\" class=textLeft style='padding: 1em'></div>"));

				//$.connection.hub.logging = true;

				if ($.connection.hub) {
					const postbackHub = $.connection.hub.createHubProxy("postbackHub");

					postbackHub.on("PostUpdate", e => {
						//LectioJSUtils.LogDebug('Message from server: ', e);
						const res = JSON.parse(e);
						//LectioJSUtils.LogDebug('Parsed message:' + res);

						const dc = $('[data-tag="dialogcontent"]');
						dc.empty();
						for (let i = 0; i < res.length; i++) {
							if (res[i] == null || res[i] === '')
								dc.append($("<br/>"));
							else {
								dc.append($("<div></div>", { text: res[i] }).css("white-space", "pre"));
							}
						}
					});

					const dialog = prevDialog;
					$.connection.hub.start().
						done(() => {
							//LectioJSUtils.LogDebug('Start done. Attaching to postback: ', postbackId);
							postbackHub.invoke("attach", postbackId);

							const btndiv = $("<div class=\"textCenter\"></div>");
							if (showpostbackcancelbtn) {
								btndiv.append($("<div class=\"button\" style='margin: 0.4em'><a href=#>Annuller</a></div>").click(() => {
									postbackHub.invoke("cancel", postbackId);
									if (prevDialog) {
										prevDialog.dialog("destroy").remove();
										prevDialog = undefined;
									}
									postbackOrNavigation.completion.resolve(undefined);
									return false;
								}));
							}
							if (showpostbackapplybtn) {
								btndiv.append($("<div class=\"button\" style='margin: 0.4em'><a href=#>Anvend</a></div>").click(() => {
									postbackHub.invoke("apply", postbackId);
									postbackOrNavigation.completion.resolve(undefined);
									return false;
								}));
							}

							if (btndiv.find("div").length > 0)
								dialog.append(btndiv);
						});
				}
			}

			// Dette er for at skjule dialogen, når postbacket downloader en fil.
			// Der bliver sat en cookie, når filen sendes.
			setTimeout(function pbTimer() {
				if (postbackOrNavigation.completion.isSettled())
					return;

				const cookie2 = LectioCookie.getCookie(pbnotifyCookieName);
				if (cookie2 !== null && cookie2 !== undefined) {
					if (prevDialog) {
						prevDialog.dialog("destroy").remove();
						prevDialog = undefined;
					}
					postbackOrNavigation.completion.resolve(undefined);
					NotificationReceived.resolve(undefined);
				} else {
					setTimeout(pbTimer, 100);
				}
			}, 100);
			return undefined;
		}

		if (activePostbackOrNavigation) {
			activePostbackOrNavigation.completion.reject('New submit started.');
			activePostbackOrNavigation = undefined;
		}

		const postbackOrNavigation = {
			completion: LectioJSUtils.CreateDeferred(),
			msg: msg,
			timeout: timeout,
			isSubmit: isSubmit,
		};
		msg = "Der arbejdes...";
		timeout = 2000;
		activePostbackOrNavigation = postbackOrNavigation;

		// Aht. updatepanel.
		postbackOrNavigation.completion.promise().finally(() => {
			if (prevDialog) {
				prevDialog.dialog('destroy').remove();
				prevDialog = undefined;
			}
		});

		LectioCookie.deleteCookieGlobal(pbnotifyCookieName);

		window.setTimeout(showSlowPostBackDialog, postbackOrNavigation.timeout);

		return postbackOrNavigation.completion.promise();
	}

	function StartSingleActivation($element: JQuery<Element | EventTarget>): (() => void) | undefined {
		if ($element.data('disabledx'))
			return undefined;

		// Vi sætter ikke disabled på elementet, da det er mistænkt for at få
		// symbian til ikke køre linket.

		$element.data('disabledx', true);

		return () => {
			$element.removeData('disabledx');
		};
	}

	let postbackDeferred: LectioDeferred<undefined> = LectioJSUtils.CreateDeferred();

	export function GetPostbackPromise(): Promise<undefined> {
		return postbackDeferred.promise();
	}

	export function InitializePostBackOverride(getCustomScrollState: (() => {}) | null): void {

		// Bliver nødt til at hooke os ind i asp.net-maskineriet for at være
		// sikre på når der vil ske postbacks.
		let theForm = window.theForm;

		const storescrollstate: () => void = () => {
			if (!getCustomScrollState)
				return;
			const ss = getCustomScrollState ? getCustomScrollState() : null;
			LectioPageOps.SetCustomScrollState(ss ?? {});
		}

		InitializeClickHelper();
		const pbOverride = (eventTarget: string, eventArgument: string): undefined | false => {
			// "use strict" kan ikke bruges her, for caller bliver brugt.
			theForm ??= ($('#aspnetForm') || $('form')).get(0) as IAspNetForm;

			const theHtmlForm = theForm as HTMLElement;
			const dosome = !theForm.onsubmit || (theForm.onsubmit((undefined as any)) !== false);
			if (!dosome)
				return undefined;

			// Vi skal have fat i det element der forsøger at lave postback,
			// for at afgøre hvordan vi skal opføre os.
			// Her er et par forsøg der forhåbentlig tilsammen rammer de
			// fleste browsere. FF har ikke window.event.
			const theEvent = localTempEvent || window.event;

			let actual: EventTarget | Element | null;
			if (theEvent)
				actual = theEvent.currentTarget || theEvent.target;
			else
				actual = null;

			// Ifmb server side confirm har vi fået fat document eller ingenting.
			if (!actual
				|| ((actual instanceof Element) && (actual.nodeName === '#document'))
				|| actual === window) {
				actual = null;
			}

			let activationToken: (() => void) | undefined;
			// Tjekker her ikke om multi-activation/DisableOnClick er sat,
			// for det er alligevel normalt ikke muligt at benytte ifbm.
			// postback.
			if (actual) {
				activationToken = StartSingleActivation($(actual));
				if (!activationToken)
					return false;
			}

			const et = eventTarget ? $('#' + eventTarget.replace(/\$/g, '_')) : $();
			const dopostbackprogress = et.length > 0 && !!et.attr('data-showpostbackprogress');
			const showpostbackcancelbtn = et.length > 0 && !!et.attr('data-showpostbackcancelbtn');
			const showpostbackapplybtn = et.length > 0 && !!et.attr('data-showpostbackapplybtn');


			const postbackId = dopostbackprogress ? Math.random() + '' : '';

			if (!et.is('[data-behavior~="no-wait-bar"]')) {
				const isSubmit = dopostbackprogress && showpostbackapplybtn && showpostbackcancelbtn;
				SubmitOrNavigationStarted(dopostbackprogress, showpostbackcancelbtn, showpostbackapplybtn, postbackId, isSubmit).finally(() => {
					if (activationToken)
						activationToken();
				});
			}

			if (!actual || !$(actual).is('[data-behavior~="keep-session-helper"]'))
				SessionHelper.Instance?.SetIsSuspended(true);

			if (!theForm.LectioPostbackId)
				$('<input type="hidden" name="LectioPostbackId" id="LectioPostbackId" value="" />').appendTo($(theHtmlForm));
			theForm.LectioPostbackId!.value = postbackId;

			if (!theForm.__EVENTTARGET) {
				$('<input type="hidden" name="__EVENTTARGET" id="__EVENTTARGET" value="tg" />').appendTo($(theHtmlForm));
			}
			if (!theForm.__EVENTARGUMENT) {
				$('<input type="hidden" name="__EVENTARGUMENT" id="__EVENTARGUMENT" value="ta" />').appendTo($(theHtmlForm));
			}
			theForm.__EVENTTARGET!.value = eventTarget;
			theForm.__EVENTARGUMENT!.value = eventArgument;
			postBackDepth++;
			theForm.submit();

			return undefined;
		};

		// Vil overskrive __doPostBack aht. ventedialog m.m., men updatepanel
		// ændrer lidt på forholdene:
		// Når asp.net PageRequestManager er involveret (fx ved brug af
		// UpdatePanel, som der bruges ved dokumentupload), kalder kontroller
		// stadig __doPostBack og WebForms_DoPostBackWithOptions, blot bliver de
		// overskrevet af PageRequestManager.
		let overrideDoPostback = true;
		if (window.Sys && Sys.WebForms && Sys.WebForms.PageRequestManager) {
			type dopostback = (target: string, commandArgument: string) => void;
			type prmEx = Sys.WebForms.PageRequestManager & {
				_originalDoPostBack?: dopostback,
				_prmInitialized?: boolean,
				_doPostBack: dopostback,
				_updatePanel: (updatePanel: HTMLElement, html: string) => void;
			};

			// PageRequestManager gemmer desuden egen kopi af __doPostBack, så
			// vores udgave ikke bliver kaldt.
			// Derfor går vi ind og overskriver den kopi af __doPostBack den har gemt.
			const prm = Sys.WebForms.PageRequestManager.getInstance() as prmEx;
			prm._originalDoPostBack = pbOverride;

			// prm kan godt vaere tilstede uden at vaere initialiseret/aktiv.
			// Hvis prm er initialiseret, forventer vi blot at blive kaldt via
			// _originalDoPostBack.
			if (prm._prmInitialized)
				overrideDoPostback = false;

			// Derudover bliver __doPostBack slet ikke kaldt for asynkrone
			// postbacks med PageRequestManager (vel fordi formen ikke bliver
			// submitted), så her beder vi istedet PageRequestManager om at
			// holde os orienterede.
			// Pas iøvrigt på med antagelser om eventrækkefølge her, se fx
			// https://msdn.microsoft.com/en-us/library/bb398976(v=vs.140).aspx
			prm.add_beginRequest((sender, args) => {
				LectioPageOps.ReplaceAutoFocusReadyDeferred_AsyncPostback();
				const currPbDef = postbackDeferred;
				postbackDeferred = LectioJSUtils.CreateDeferred();
				const p2 = SubmitOrNavigationStarted(false, false, false, '', true);
				p2.then(arg => {
					currPbDef.resolve(arg);
				}, arg => currPbDef.reject(arg));
			});
			prm.add_endRequest((sender, args) => {
				const err = args.get_error();
				return LatestSubmitEnded(
					err
						? { 'status': 'error', info: err }
						: undefined);
			});

			// STM 28603: safari 10 fejler sommetider i pagerequestmanagers
			// anvendelse af arguments.caller.
			// Derfor har vi her en minimalt tilpasset/afskåret version af
			// denne, som vi tager i brug.
			type PostbackSettings = {
				async: boolean;
			};
			type PageRequestManager = {
				_additionalInput: {} | null;
				_form: IAspNetForm;
				_onsubmit: (this: HTMLElement, ev: Event) => any;
				_onFormSubmit: () => void;
				_originalDoPostBack: (a: string, b: string) => void;
				_postBackSettings: PostbackSettings;
				// _createPostBackSettings: (x: boolean) => {};
				_isCrossPost: boolean;
				_masterPageUniqueID: string;
				_uniqueIDToClientID: (uniqueId: string) => string;
				_postBackControlIDs: string[];
				_asyncPostBackControlIDs: string[];
				_createPostBackSettings: (a: boolean, b?: null, c?: string) => PostbackSettings;
				_findNearestElement: (s: string) => HTMLElement;
				_getPostBackSettings: (e: HTMLElement, s: string) => PostbackSettings;
			};
			const Sys$WebForms$PageRequestManager$_doPostBack_fixed: dopostback = function (
				this: PageRequestManager,
				eventTarget, eventArgument
			): void {
				LectioJSUtils.LogDebug('dopostback');
				// Her var der noget kode der kiggede på arguments.caller o.l.
				// for at skaffe en event.
				this._additionalInput = null;
				const form = this._form;
				if ((eventTarget === null) || (typeof (eventTarget) === "undefined") || (this._isCrossPost)) {
					this._postBackSettings = this._createPostBackSettings(false);
					this._isCrossPost = false;
				}
				else {
					let mpUniqueID = this._masterPageUniqueID;
					const clientID = this._uniqueIDToClientID(eventTarget);
					let postBackElement = document.getElementById(clientID);
					if (!postBackElement && mpUniqueID) {
						if (eventTarget.indexOf(mpUniqueID + "$") === 0) {
							postBackElement = document.getElementById(clientID.substr(mpUniqueID.length + 1));
						}
					}
					if (!postBackElement) {
						if (Array.contains(this._asyncPostBackControlIDs, eventTarget)) {
							this._postBackSettings = this._createPostBackSettings(true, null, eventTarget);
						}
						else {
							if (Array.contains(this._postBackControlIDs, eventTarget)) {
								this._postBackSettings = this._createPostBackSettings(false);
							}
							else {
								let nearestUniqueIDMatch = this._findNearestElement(eventTarget);
								if (nearestUniqueIDMatch) {
									this._postBackSettings = this._getPostBackSettings(nearestUniqueIDMatch, eventTarget);
								}
								else {
									if (mpUniqueID) {
										mpUniqueID += "$";
										if (eventTarget.indexOf(mpUniqueID) === 0) {
											nearestUniqueIDMatch = this._findNearestElement(eventTarget.substr(mpUniqueID.length));
										}
									}
									if (nearestUniqueIDMatch) {
										this._postBackSettings = this._getPostBackSettings(nearestUniqueIDMatch, eventTarget);
									}
									else {
										// Her var der kode der var afhængig af
										// window.event, og dermed
										// arguments.caller.  Bliver brugt når
										// postback event target ikke findes i
										// dom'en, hvilket sker for filvælgeren.
										this._postBackSettings = this._createPostBackSettings(false);
									}
								}
							}
						}
					}
					else {
						if (postBackElement.getAttribute('data-fullpostback') === '1')
							this._postBackSettings = this._createPostBackSettings(false);
						else
							this._postBackSettings = this._getPostBackSettings(postBackElement, eventTarget);
					}
				}
				if (!this._postBackSettings.async) {
					form.onsubmit = this._onsubmit as any;
					this._originalDoPostBack(eventTarget, eventArgument);
					(form as any).onsubmit = null;
					return;
				}

				if (typeof (window.Page_ClientValidate) === 'function') {
					// 20170519 RH: tilfoejelse for at saette fokus ifbm. submit
					// ved validatering, og ikke ved hver validering, hvilket
					// ogsaa sker ved blur.
					if (!window.Page_Validators)
						throw new Error('Ingen Page_Validators?');
					const invalids = window.Page_Validators.filter(v => !v.isvalid);
					// Vil gerne saette fokus til det foerste felt med en
					// validator der fejler.  Antager at der svarer til at
					// vaelge den foerste validator.
					const toFocus = !invalids.length ? null : invalids[0];
					if (toFocus !== null)
						focusInputValidator(toFocus);
					// Ved async postback ønsker vi ikke at sende et postback hvis der er validerings-fejl,
					// på samme måde som required fields forhindre det for normale postback.
					if (invalids.length > 0)
						return;
				}
				form.__EVENTTARGET!.value = eventTarget;
				form.__EVENTARGUMENT!.value = eventArgument;
				storescrollstate();
				this._onFormSubmit();
			};

			LectioJSUtils.LogDebug('PostBackHelper: Init postback override')
			prm._doPostBack = Sys$WebForms$PageRequestManager$_doPostBack_fixed;

			const _update_orig = prm._updatePanel;
			prm._updatePanel = (updatepanel, html) => {
				const updateByMerge = updatepanel.getAttribute('data-enable-update-by-merge') && [].length == 0;
				performance.mark('updatepanel-replacehtml', { detail: { id: updatepanel.id, updateByMerge } });
				if (!updateByMerge) {
					_update_orig.apply(prm, [updatepanel, html]);
					return;
				}
				// Flg. kommer fra ms's impl.. Den laver ogsaa noget script-dispose-halloej,
				// som man kunne overveje ogsaa at kopiere...
				Sys.Application.disposeElement(updatepanel, true);

				LectioJSUtils.AssertArgument(updatepanel.childElementCount === 1, 'one child policy');
				const sc = updatepanel.children[0];
				morph(sc, html);
			}

			if (!overrideDoPostback)
				window.__doPostBack = Sys$WebForms$PageRequestManager$_doPostBack_fixed.bind(prm);
		}
		if (overrideDoPostback)
			window.__doPostBack = pbOverride;

		// 20170519 RH: For at saette fokus paa inputfelter der fejler (i det
		// mindste client side-)validering, overtager vi nu ogsaa
		// WebForm_DoPostBackWithOptions.
		type dopb = (options: {
			validation: boolean,
			validationGroup: string,
			actionUrl?: string,
			trackFocus?: boolean,
			eventTarget: string,
			eventArgument: string,
			clientSubmit: boolean,
		}) => void;
		const WebForm_DoPostBackWithOptions__override: dopb = options => {
			let validationResult = true;
			if (options.validation) {
				if (typeof (window.Page_ClientValidate) === 'function') {
					validationResult = window.Page_ClientValidate(options.validationGroup);

					// 20170519 RH: tilfoejelse for at saette fokus ifbm. submit
					// ved validatering, og ikke ved hver validering, hvilket
					// ogsaa sker ved blur.
					if (!window.Page_Validators)
						throw new Error('Ingen Page_Validators?');
					const invalids = window.Page_Validators.filter(v => !v.isvalid);
					// Vil gerne saette fokus til det foerste felt med en
					// validator der fejler.  Antager at der svarer til at
					// vaelge den foerste validator.
					const toFocus = !invalids.length ? null : invalids[0];
					if (toFocus !== null)
						focusInputValidator(toFocus);
				}
			}
			if (validationResult) {
				if ((typeof (options.actionUrl) !== "undefined") && (options.actionUrl != null) && (options.actionUrl.length > 0)) {
					theForm.action = options.actionUrl;
				}
				if (options.trackFocus) {
					const lastFocus = (theForm.elements as any)["__LASTFOCUS"];
					if ((typeof (lastFocus) !== "undefined") && (lastFocus != null)) {
						if (typeof (document.activeElement) === "undefined") {
							lastFocus.value = options.eventTarget;
						}
						else {
							const active = document.activeElement as HTMLElement & { name?: string };
							if (active) {
								if ((typeof (active.id) !== "undefined") && (active.id != null) && (active.id.length > 0)) {
									lastFocus.value = active.id;
								}
								else if (typeof (active.name) !== "undefined") {
									lastFocus.value = active.name;
								}
							}
						}
					}
				}
			}
			if (options.clientSubmit) {
				window.__doPostBack(options.eventTarget, options.eventArgument);
			}
		}

		if (window.WebForm_DoPostBackWithOptions) {
			const wrapper: dopb = (options) => {
				LectioJSUtils.LogDebug('WebForm_DoPostBackWithOptions');
				try {
					WebForm_DoPostBackWithOptions__override(options);
				}
				catch (e) {
					if (e instanceof Error)
						throw new Error('Fejl i WebForm_DoPostBackWithOptions: ' + e.message + "\r\n" + e.stack);
					else
						throw new Error('Fejl i WebForm_DoPostBackWithOptions (not Error): ' + e);
				}
			}
			window.WebForm_DoPostBackWithOptions = wrapper;
		}
	}

	function focusInputValidator(page_validator: { controltovalidate: string, isvalid: boolean }): void {
		if (page_validator && page_validator.controltovalidate) {
			let ctrl = document.getElementById(page_validator.controltovalidate);
			if (ctrl) {
				if (ctrl instanceof HTMLInputElement && ctrl.type === 'hidden' && ctrl.parentElement != null) {
					const inputs = ctrl.parentElement.getElementsByTagName('input');
					if (inputs.length === 2 && ((inputs[0].type === 'text' && inputs[1].type === 'hidden')
						|| (inputs[0].type === 'hidden' && inputs[1].type === 'input'))) {
						// vi har nok at goere med en vaelger.
						const textinput = inputs[0].type === 'text' ? inputs[0] : inputs[1];
						ctrl = textinput;
					}
				}
				ctrl.focus();
			}
		}
	}

	function InitializeClickHelper(): void {
		$('body').on('keydown click lecclick', 'a[data-role="button"]', event => {
			const actual = $(event.currentTarget);

			switch (event.type) {
				case "keydown": {
					if (event.keyCode === LectioKeyCode.SPACE) {
						// Stop scroll, sammen med return false.
						event.preventDefault();
						event.stopImmediatePropagation();

						actual.trigger('lecclick');
					}
					return;
				}
				case "lecclick":
				case "click": {
					const href = actual.attr('href') as string;
					const validHref = href && href !== '#' ? href : "";

					if (validHref) {
						// Forsøg på at åbne i nyt vindue/faneblad.
						if (event.ctrlKey || event.metaKey || event.shiftKey ||
							event.altKey || actual.attr('target') === "_blank") {
							return;
						}
					}

					if (actual.is(':disabled'))
						event.preventDefault();

					// håndterer også hvis inline js returnerer false.
					if (event.isDefaultPrevented())
						return;

					if (event.type === 'lecclick') {
						// jquery click() får ikke browseren til at agere på
						// href som hvis brugeren klikkede selv.
						// Vi kan heller ikke bruge den direkte til at få
						// onclick-handler til at køre, for i givet fald vil
						// den køre inden vi kan forhindre dobbeltklik mv..

						const e = $.Event("click", { srcElement: actual[0] });
						localTempEvent = (e as any).originalEvent;
						try {
							actual.trigger(e);
						} finally {
							// Bliver nødt til at have localTempEvent, for
							// ifbm. genvejstaster/lecclick/trigger peger
							// window.event på det skjulte input-felt.
							localTempEvent = null;
						}

						if (e.isDefaultPrevented())
							return;

						if (validHref)
							window.location.href = href;
					}

					const isBookmarkHref = href != null && href != undefined && href.indexOf("#") === 0;
					if (event.type === 'click' && validHref && !isBookmarkHref) {
						let activationToken: (() => void) | undefined;
						if (!actual.is('[data-behavior~="multi-activation"]')) {
							activationToken = StartSingleActivation(actual);
							if (!activationToken) {
								event.preventDefault();
								return;
							}
						}
						if (!actual.is('[data-behavior~="no-wait-bar"]')) {
							SubmitOrNavigationStarted(false, false, false, '', false).finally(() => {
								if (activationToken)
									activationToken();
							});
						}
					}

					break;
				}
				default:
					JSErrorHandling.reportJSError("button: got unexpected event type " + event.type);
					break;
			}
		});
	}
}
