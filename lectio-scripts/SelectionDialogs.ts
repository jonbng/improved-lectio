import { LectioJSUtils, Tagged } from "./LectioJSUtils";
import { LectioConfirmBox } from "./LectioConfirmBox";

type UserString = Tagged<string, 'userString'>;
type Html = Tagged<string, 'html'>;
type SerializedId = Tagged<string, 'serializedId'>;
type Year = Tagged<number, 'year'>;
type PhaseId = Tagged<number, 'phaseId'>;
type QuizId = Tagged<number, 'quizId'>;
type ActivityContentId = Tagged<number, 'activityContentId'>;
type AbsenseId = Tagged<number, 'absenseId'>;
type ShowDialogMode = Tagged<'savefile' | 'pickfile' | 'pickeditorcontent', 'xxmode'>;

export namespace SelectionDialogs {

	export type HomeworkDialogOptions = {
		showHomeworkCreationMannerOptions: false,
		requirePhaseMatHtml?: boolean,
	} | {
		showHomeworkCreationMannerOptions: true;
		homeworkCreationOptionAktuelleAfsnit: Tagged<'visible' | 'hidden' | 'disabled', 'creationmanner'>;
		defaultHomeworkCreationManner: HomeworkCreationManner;
	};

	export type ShowDocumentDialogOptions = {
		title: UserString;
		year: Year;
		isPublic: boolean;
		showCheckbox: boolean;
		warnIfUploadIsOld: boolean;
		activityContentId?: number;
		mode?: ShowDialogMode;
	};

	export type SelectedSerializedAnyFileId = {
		type: "serializedAnyFileId"
		serializedId: SerializedId;
		isPublic?: boolean;
		filename: string;
	};
	export type SelectedSerializedAnyNonFileId = {
		type: "serializedNonFileId";
		serializedId: SerializedId;
	};

	export type SelectedPhaseContent = {
		type: "selectedPhaseContent";
		schoolId: number,
		phaseId: PhaseId | undefined,
		forloebMaterialeSectionIds: number[],
		absenseIds: AbsenseId;
		activityContentIds: ActivityContentId[];
		quizIds: QuizId;
	};

	/** Repræsenterer måde at oprette ny lektie på. */
	export enum HomeworkCreationManner {
		auto = "auto",
		lektie = "lektie",
		oevrigIndhold = "oevrigtIndhold",
		aktuelleAfsnit = "aktuelleAfsnit"
	}

	/** Repraesenterer foreningsmaengden af de forskellige typer indhold der kan
	 * vælges til at oprette lektier ud fra. */
	export type ResourceSelection =
		(SelectedSerializedAnyFileId
			| SelectedSerializedAnyNonFileId
			| SelectedPhaseContent
			| {
				type: "link",
				link: Tagged<string, 'link'>;
				title: UserString;
			}
			| { type: "createQuiz" }
			| { type: "html", html: Html })
		& { creationManner?: HomeworkCreationManner };

	export enum InitialFolder { createLink = 'createLink', uploadFile = 'uploadFile', video = 'video' }

	export function ShowChooseDocumentDialog(
		options: ShowDocumentDialogOptions
	): Promise<SelectedSerializedAnyFileId | undefined> {
		return ShowNonHomeworkDialogImpl(options, null);
	}

	export function ShowChooseDocumentOrEditorContentDialog(
		options: {
			title: UserString;
			year: Year;
		},
		folderId: InitialFolder | null
	): Promise<SelectedSerializedAnyFileId | undefined> {
		return ShowNonHomeworkDialogImpl({
			isPublic: false, showCheckbox: false,
			warnIfUploadIsOld: false,
			title: options.title,
			year: options.year,
			mode: 'pickeditorcontent'
		}, folderId);
	}

	function ShowNonHomeworkDialogImpl(
		options: ShowDocumentDialogOptions,
		folderId: InitialFolder | null
	): Promise<SelectedSerializedAnyFileId | undefined> {
		function getnum(val: boolean) { return val ? 1 : 0; }

		const srcurl = LectioJSUtils.GetBaseSchoolURL() + "/documentchoosercontent.aspx?year=" + options.year +
			"&ispublic=" + getnum(options.isPublic) +
			"&showcheckbox=" + getnum(options.showCheckbox) +
			"&mode=" + (options.mode || 'pickfile') +
			(folderId ? "&folderid=" + folderId : "") +
			(options.activityContentId ? "&activitycontentid=" + options.activityContentId : "") +
			(options.warnIfUploadIsOld ? "&warnIfUploadIsOld=1" : "");

		const iframe = $('<iframe id="iframedocchooser" scrolling="no"  frameBorder="0" src="' + srcurl + '" />').appendTo('body');

		return ManageAnyDialog<SelectedSerializedAnyFileId>({
			title: options.title
		}, {
			showHomeworkCreationMannerOptions: false
		}, iframe);
	}

	export async function Test_WaitFirstDialog(): Promise<Test_DialogInteraction> {
		const firstDialogReady = Promise.all([
			firstDialogDeferred.promise(),
			contentInitializedDeferred.promise(),
		]);
		const [interaction] = await firstDialogReady;
		return interaction;
	}

	export function ShowChooseFolderDialog(
		options: {
			title: UserString,
			year: Year
		}
	): Promise<SelectedSerializedAnyFileId | undefined> {
		const srcurl = LectioJSUtils.GetBaseSchoolURL() + "/documentchoosercontent.aspx?mode=savefile&year=" + options.year;
		const iframe = $('<iframe id="iframedocchooser" scrolling="Auto"  frameBorder="0" src="' + srcurl + '" />').appendTo('body');

		return ManageAnyDialog<SelectedSerializedAnyFileId>({
			title: "Vælg mappe", okButtonText: 'Gem i mappe'
		}, {
			showHomeworkCreationMannerOptions: false,
		}, iframe);
	}

	export function ShowHomeworkPickerDialog(
		options: {
			year: Year,
			activitycontentid: ActivityContentId,
			phaseids: string,
			folderid: number | 'createLink'
		} & HomeworkDialogOptions
	): Promise<ResourceSelection | undefined> {
		const srcurl = LectioJSUtils.GetBaseSchoolURL() + "/documentchoosercontent.aspx?mode=pickhomework"
			+ "&year=" + options.year
			+ "&activitycontentid=" + options.activitycontentid
			+ (!options.phaseids ? "" : "&phaseids=" + options.phaseids)
			+ (!options.folderid ? "" : "&folderid=" + options.folderid)
			;
		const iframe = $('<iframe id="iframedocchooser" scrolling="Auto"  frameBorder="0" src="' + srcurl + '" />').appendTo('body');

		return ManageAnyDialog<ResourceSelection>(
			{ title: "Vælg materiale" }, options, iframe);
	}

	export function ShowHomeworkPickerDialog_ForPhaseMaterial(
		contentOptions: {
			year: Year,
			phaseid: string,
		}
	): Promise<ResourceSelection | undefined> {
		const srcurl = LectioJSUtils.GetBaseSchoolURL() + "/documentchoosercontent.aspx?mode=pickeditorcontent_forphasematerial"
			+ "&year=" + contentOptions.year
			+ (!contentOptions.phaseid ? "" : "&phaseids=" + contentOptions.phaseid)
			;
		const iframe = $('<iframe id="iframedocchooser" scrolling="Auto"  frameBorder="0" src="' + srcurl + '" />').appendTo('body');

		return ManageAnyDialog<ResourceSelection>({
			title: "Vælg materiale"
		}, {
			showHomeworkCreationMannerOptions: false,
			requirePhaseMatHtml: true
		}, iframe);
	}

	function ClampNumber(val: number, minval: number, maxval: number): number {
		if (minval > maxval) {
			throw new Error(("minval >= maxval"));
		}
		if (val < minval) {
			return minval;
		} else if (val > maxval) {
			return maxval;
		} else {
			return val;
		}
	}

	type BaseMessage = { type: string };

	type HostUnderstoodMessages = {
		'InitFromClient': { type: 'InitFromClient' };
		'SupportsOkButton': {
			type: 'SupportsOkButton',
			supportsOkButton: boolean
		};
		'Selected': { type: 'Selected', data: ResourceSelection };
		/** Betyder at filen er gemt, eller at dialogen paa anden vis har
		 *  afsluttet sit arbejde uden at producere et resultat.
		 */
		'Done': { type: 'Done' };
		'Cancel': { type: 'Cancel' };
	};
	type IFrameUnderstoodMessages = {
		'InitFromServer': { type: 'InitFromServer' };
		'OkButtonPressed': {
			type: 'OkButtonPressed',
			preferEditorMarkup: 'no' | 'headingvariants_on' | 'headingvariants_off',
		};
	};

	/** Dette er den type objektet med funktionerne der modtager beskederne, skal have. */
	type DispatchTable<T> = {
		[K in keyof T]: (msg: T[K] & { type: K }) => void;
	};

	type OneOfMessageTypes<TUnderstoodMessages, K extends keyof TUnderstoodMessages = keyof TUnderstoodMessages> =
		TUnderstoodMessages[K] & { type: K };

	/**
	 * Leverer typetjek ifm. afsendelse af beskeder:
	 * Dette er typen for en funktion der kun vil acceptere/sende beskeder som
	 * defineret i @type {TUnderstoodMessages}.
	 * Soerger for at beskederne har en 'type'-property med samme vaerdi som
	 * feltet i @type {TUnderstoodMessages}.
	 */
	type MessageSenderFunction<TUnderstoodMessages, K extends keyof TUnderstoodMessages = keyof TUnderstoodMessages> =
		(msg: OneOfMessageTypes<TUnderstoodMessages>, transfer?: any[]) => void;

	function PrepareDispatchTable<TUnderstoodMessages>(
		impls: DispatchTable<TUnderstoodMessages>
	): { [type: string]: ((msg: BaseMessage) => void) | undefined } {
		return impls as any;
	}

	let debugdontsendselection = false;
	export function DebugDontSendSelection(activate: boolean) {
		debugdontsendselection = activate;
	}

	export function DocumentChooserContentInitialize(
		options: Readonly<{ enableOkButton: boolean, doPostBack: (arg: string) => void }>
	): {
		SendSelectionToHost: (data: ResourceSelection) => void;
		SendMessageToHost: (
			msg: OneOfMessageTypes<HostUnderstoodMessages>,
			confirmation?: { title: string; questionHtml: string; } | undefined
		) => void;
	} {
		const dispatch = PrepareDispatchTable<IFrameUnderstoodMessages>({
			'InitFromServer': _ => {
				portToHost = portToHostFromTheStart;
				sendMessagesInQueue();
			},
			'OkButtonPressed': msg => {
				// 'preferEditorMarkup' udtrykker om brugerne har valgt at
				// indsaette 'I aktuelle afsnit' (radioknap).
				// Betyder at isf. at modificere databasen direkte (oprette
				// lektier...), oensker vi at faa noget html som vi kan give til
				// editoren, der derefter kan gemme det.
				options.doPostBack(JSON.stringify({ preferEditorMarkup: msg.preferEditorMarkup }));
			}
		});

		let portToHost: MessagePort | null;
		let portToHostFromTheStart: MessagePort | null;
		const sendQueue: OneOfMessageTypes<HostUnderstoodMessages>[] = [];

		function sendMessagesInQueue() {
			LectioJSUtils.AssertArgument(portToHost != null, 'portToHost != null');
			if (!portToHost)
				throw new Error('portToHost er null.');
			while (sendQueue.length) {
				const msg = sendQueue.shift()!;
				// Aht. debug, saa man nemmere kan se hvad der sendes.
				if (msg.type === 'Selected' && debugdontsendselection) {
					LectioJSUtils.LogDebug('SelectionDialogs: ' + msg.type, msg.data);
					sendQueue.push(msg);
					return;
				}

				portToHost.postMessage(msg);
			}
		}

		const sendToHost: MessageSenderFunction<HostUnderstoodMessages> = msg => {
			// Sender som postmessage isf. direkte kald.
			// Ved direkte kald bliver i det mindste chrome 60 en smule
			// forvirret, fx. bliver window.error ikke kaldt ved fejl, og
			// breakpoints virker ikke/ustabilt.

			sendQueue.push(msg);
			if (portToHost)
				sendMessagesInQueue();
		};

		{
			const mc = new MessageChannel();
			const pp = mc.port1;
			pp.onmessage = evt => {
				const pbase: Partial<BaseMessage> = evt.data;
				if (typeof pbase.type !== 'string')
					throw new Error('Besked: Manglende/fejlagtig type-property.' + pbase.type);

				const messageType = pbase.type;
				const f = dispatch[messageType];
				if (!f)
					throw new Error('MessageType ' + messageType + ' mangler handler.');
				f(pbase as BaseMessage);
			};

			const mm: HostUnderstoodMessages['InitFromClient'] = { 'type': 'InitFromClient' };
			window.parent.postMessage(mm, window.origin, [mc.port2]);
			portToHostFromTheStart = pp;
		}

		setTimeout(() => {
			if (!portToHost)
				console.warn('port til host ikke modtaget efter nogle sekunder.');
		}, 5000);
		document.body.addEventListener('keydown', evt => {
			const isEscape = evt.code === 'Escape' && !(evt.ctrlKey || evt.altKey || evt.shiftKey || evt.metaKey);
			if (isEscape)
				sendToHost({ type: 'Cancel' });
		});

		sendToHost({ type: 'SupportsOkButton', supportsOkButton: options.enableOkButton });

		return {
			SendSelectionToHost: (data: ResourceSelection) => sendToHost({ type: 'Selected', data: data }),
			SendMessageToHost: (
				msg: OneOfMessageTypes<HostUnderstoodMessages>,
				confirmation?: { title: string, questionHtml: string }
			) => {
				if (!confirmation) {
					sendToHost(msg);
					return;
				}

				LectioConfirmBox
					.ShowConfirm(confirmation.title, confirmation.questionHtml)
					.then(ok => {
						if (ok)
							sendToHost(msg);
					});
			}
		};
	}


	const contentInitializedDeferred = LectioJSUtils.CreateDeferred<undefined>();
	const firstDialogDeferred = LectioJSUtils.CreateDeferred<Test_DialogInteraction>();

	function ManageAnyDialog<TResult extends (ResourceSelection | undefined)>(
		displayOptions: Readonly<{ title: UserString, okButtonText?: UserString }>,
		contentOptions: Readonly<HomeworkDialogOptions>,
		iframe: JQuery
	): Promise<TResult | undefined> {
		const maxDialogWidth = 1440; //px
		const maxDialogHeight = 705; //px
		const minDialogWidth = 600; //px
		const minDialogHeight = 500; //px

		const def = LectioJSUtils.CreateDeferred<TResult | undefined>();
		const defaultCreationManner = contentOptions.showHomeworkCreationMannerOptions
			? contentOptions.defaultHomeworkCreationManner
			: null;

		let sendToIframe: MessageSenderFunction<IFrameUnderstoodMessages> | undefined;

		function notifyCaller(documentInfo: TResult | undefined) {
			iframe.remove();

			def.resolve(documentInfo);
		}

		function getSelectedCreationManner(): HomeworkCreationManner {
			const checked = iframe.parent('.ui-dialog').find('input[type=radio]:checked');
			// Naar radioknappen "i aktuelle afsnit" er disabled, kan tryk paa
			// dens label stadig fjerne valget af anden radioknap, i det mindste
			// i chrome 60....
			const val = checked.val() as string || LectioJSUtils.GetNotNullValue(defaultCreationManner);
			LectioJSUtils.AssertEnumValue(HomeworkCreationManner, val);
			const manner = val as HomeworkCreationManner;

			return manner;
		}

		const recieveSelectionFromClient = (documentInfo: TResult) => {
			if (contentOptions.showHomeworkCreationMannerOptions && documentInfo != null) {
				documentInfo.creationManner = getSelectedCreationManner();
			}
			notifyCaller(documentInfo);
		};

		let iframeContentLoadEventCount = 0;
		const dispatch = PrepareDispatchTable<HostUnderstoodMessages>({
			'InitFromClient': _ => {
				throw new Error('skal ikke haandteres her');
			},
			'SupportsOkButton': msg => {
				// Vil gerne have at man kan faa fokus i foerste
				// tekstboks/knap/whatever ved et enkelt tryk paa tab, ligesom i
				// resten af lectio. (ogsaa) Derfor flytter vi her keyboardfokus
				// ind i iframen.
				if (iframeContentLoadEventCount++ === 0) {
					iframe.focus();
				}

				const bs = iframe.parent('.ui-dialog').find('.ui-dialog-buttonset');
				let btn = bs.find('button[lec-role=ok]');
				if (btn.length === 0) {
					btn = $('<button type=button lec-role=ok>Vælg</button>');
					if (displayOptions.okButtonText)
						btn.text(displayOptions.okButtonText);
					btn.insertBefore(bs.find('button:first'));
					btn.on('click', () => {
						sendToIframe!({
							type: 'OkButtonPressed',
							preferEditorMarkup: (() => {
								if (contentOptions.showHomeworkCreationMannerOptions &&
									getSelectedCreationManner() === HomeworkCreationManner.aktuelleAfsnit)
									return 'headingvariants_off';
								if (!contentOptions.showHomeworkCreationMannerOptions &&
									contentOptions.requirePhaseMatHtml === true)
									return 'headingvariants_on';
								return 'no';
							})()
						});
					});
				}
				if (msg.supportsOkButton)
					btn[0].removeAttribute('disabled');
				else
					btn[0].setAttribute('disabled', '');
				contentInitializedDeferred.resolve(undefined);
			},
			'Selected': msg => {
				recieveSelectionFromClient(msg.data as TResult);
			},
			'Done': _ => {
				notifyCaller(undefined);
			},
			'Cancel': _ => {
				notifyCaller(undefined);
			}
		});

		function onMessage(evt: MessageEvent) {
			const pdata: Partial<BaseMessage> = evt.data;
			LectioJSUtils.LogDebug('onmessage', evt.data);
			if (typeof pdata.type !== 'string')
				throw new Error('Besked: Manglende/fejlagtig type-property.' + pdata.type);

			const messageType = pdata.type;
			const f = dispatch[messageType];
			if (!f)
				throw new Error('MessageType ' + messageType + ' mangler handler.');

			f(pdata as BaseMessage);
		}

		// Denne handler er kun beregnet til at modtage den initielle
		// 'InitFromClient'-besked fra iframen.
		const windowonmessage = (evt: MessageEvent<any>): void => {
			if (evt.origin !== window.origin)
				return;

			const pdata: Partial<BaseMessage> = evt.data;
			LectioJSUtils.LogDebug('window.onmessage', evt.data);
			if (typeof pdata.type !== 'string')
				return;

			const messageType = pdata.type;
			if (messageType !== 'InitFromClient')
				return;

			const portToClient = evt.ports[0] as MessagePort; // ok
			sendToIframe = function (msg, transfer) {
				return portToClient.postMessage(msg, transfer as Transferable[]);
			};
			portToClient.onmessage = onMessage;
			const mm: IFrameUnderstoodMessages['InitFromServer'] = { 'type': 'InitFromServer' };
			portToClient.postMessage(mm);
		};
		window.addEventListener('message', windowonmessage);

		const buttons = [
			{
				text: 'Annuller',
				click: () => { iframe.remove(); }
			}
		];

		const dialogHeight = ClampNumber(window.innerHeight - 100, minDialogHeight, maxDialogHeight);
		const dialogWidth = ClampNumber(window.innerWidth - 50, minDialogWidth, maxDialogWidth);

		iframe.dialog({
			modal: true,
			autoOpen: true,
			dialogClass: 'documentchooserDialog',
			title: displayOptions.title,
			height: dialogHeight,
			width: dialogWidth,
			closeOnEscape: true,
			resizable: true,
			buttons: buttons,
			close: evt => {
				def.resolve(undefined);
			},
			create: evt => {
				let setCreationManner: Test_DialogInteraction['SetCreationManner'];
				if (contentOptions.showHomeworkCreationMannerOptions) {
					const pane = iframe.parent('.ui-dialog').find('.ui-dialog-buttonpane');
					LectioJSUtils.AssertArgument(pane.length > 0, "pane.length > 0");
					const container = $('<div class="insert-as-type"></div>');

					container.append(`<input type=radio name=dialog_insertionmanner ${defaultCreationManner === SelectionDialogs.HomeworkCreationManner.auto ? 'checked' : ''} id=dialog_auto value=${SelectionDialogs.HomeworkCreationManner.auto}><label for=dialog_auto>Auto</label>`);
					container.append(`<input type=radio name=dialog_insertionmanner ${defaultCreationManner === SelectionDialogs.HomeworkCreationManner.lektie ? 'checked' : ''} id=dialog_lektie value=${SelectionDialogs.HomeworkCreationManner.lektie}><label for=dialog_lektie>Lektie</label>`);
					container.append(`<input type=radio name=dialog_insertionmanner ${defaultCreationManner === SelectionDialogs.HomeworkCreationManner.oevrigIndhold ? 'checked' : ''} id=dialog_oevrigtindhold value=${SelectionDialogs.HomeworkCreationManner.oevrigIndhold}><label for=dialog_oevrigtindhold>Øvrigt indhold</label>`);
					if (contentOptions.homeworkCreationOptionAktuelleAfsnit === 'disabled' || contentOptions.homeworkCreationOptionAktuelleAfsnit === 'visible') {
						const disabled = contentOptions.homeworkCreationOptionAktuelleAfsnit === 'disabled' ? "disabled" : '';
						container.append(`<input type=radio name=dialog_insertionmanner ${defaultCreationManner === SelectionDialogs.HomeworkCreationManner.aktuelleAfsnit ? 'checked' : ''} id=dialog_aktuelleafsnit value=${SelectionDialogs.HomeworkCreationManner.aktuelleAfsnit} ${disabled}><label for=dialog_aktuelleafsnit ${disabled}>I aktuelle afsnit</label>`);
					}
					pane.append(container);

					setCreationManner = creationManner => {
						const radio = container.find('input[type=radio][value=' + creationManner + ']');
						LectioJSUtils.AssertArgument(radio.length === 1, "radio.length");
						radio.click();
					};
				}
				else
					setCreationManner = () => { throw new Error('Der er ikke creationManner i denne dialog.'); };

				firstDialogDeferred.resolve({
					SetCreationManner: setCreationManner,
					Closed: def.promise().then(_ => undefined),
				});
			}
		});

		//Fix for weird inline styles specified by dialog()
		iframe.removeAttr('style');
		iframe.css('width', dialogWidth - 20 + 'px');
		iframe.css('height', dialogHeight - 78 + 'px');

		return def.promise();
	}

	type Test_DialogInteraction = {
		SetCreationManner: (creationManner: HomeworkCreationManner) => void;
		Closed: Promise<void>;
	};
}
