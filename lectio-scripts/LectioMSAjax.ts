import { HtmlUtilities } from "./HtmlUtilities";
import { LCDocumentPresentation } from "./LC/LCDocumentPresentation";
import { LectioJSUtils } from "./LectioJSUtils";
import { PostBackHelper } from "./PostBackHelper";

export namespace LectioScript {
	export function Initialize(config?: Readonly<{
		unsavedChangesArgs: undefined | { hasUnsavedChanges: boolean, definedcontrol: string | undefined, SCAButtonsId: string | undefined },
	}>): void {
		const UnsavedChangesArgs = config?.unsavedChangesArgs;
		let hasRegisteredBeforeUnload = false;

		const considerRegisterBeforeUnload = () => {
			if (hasRegisteredBeforeUnload)
				return;
			hasRegisteredBeforeUnload = true;

			window.addEventListener('beforeunload', evt => {

				const theForm = window.theForm;
				const eventTarget = theForm.__EVENTTARGET;
				const eventArgs = theForm.__EVENTARGUMENT;
				if (eventTarget != undefined && UnsavedChangesArgs) {
					//Ignorerer gem og anvend postbacks
					if (UnsavedChangesArgs.SCAButtonsId != "" && UnsavedChangesArgs.SCAButtonsId != undefined)
						if (eventTarget.value.includes(UnsavedChangesArgs.SCAButtonsId)) {
							return;
						}
					// Ignorerer bestemte postback fremkaldende grid commands.
					if (eventArgs != undefined)
						if (['DEL', 'CPYINLINE', 'CPY', 'EDT',].indexOf(eventArgs.value.split('$')[0]) != -1) {
							return;
						}
				}
				if (PostBackHelper != null && PostBackHelper.PostbackHasStarted())
					return;
				// Sættes her for at fjerne den nye vaerdi
				setTimeout(revertControlValue, 500);
				evt.preventDefault();
				PostBackHelper.LatestSubmitEnded();
			});
		}



		const revertControlValue = () => {
			const activeelement = document.activeElement;

			if (activeelement instanceof HTMLInputElement) {
				if (activeelement.type === 'checkbox' || activeelement.type === 'radio')
					activeelement.checked = activeelement.defaultChecked;
				else
					activeelement.value = activeelement.defaultValue;
			}
			else if (activeelement instanceof HTMLSelectElement) {
				for (let idx = 0; idx < activeelement.options.length; idx++) {
					if (activeelement.options[idx].defaultSelected)
						activeelement.selectedIndex = idx;
				}
			}
			else if (activeelement instanceof HTMLTextAreaElement)
				activeelement.value = activeelement.defaultValue;
			else
				LectioJSUtils.LogDebug('other change: ', activeelement);
		}

		const registerUnsavedBrowserChanges = (checkunsavedelement: string) => {
			$(checkunsavedelement).on('change', 'input, select, textarea', evt => {
				if (UnsavedChangesArgs) {
					considerRegisterBeforeUnload();
				}
				const input = evt?.target;
				if (input instanceof HTMLInputElement) {
					if (input.type === 'checkbox' || input.type === 'radio')
						input.defaultChecked = input.checked;
					else
						input.defaultValue = input.value;
				}
				else if (input instanceof HTMLSelectElement) {
					const si = input.selectedIndex;
					for (let idx = 0; idx < input.options.length; idx++) {
						const option = input.options[idx];
						option.defaultSelected = idx === si;
					}
				}
				else if (input instanceof HTMLTextAreaElement)
					input.defaultValue = input.value;
				else
					LectioJSUtils.LogDebug('other change:', evt);
			});
		}

		if (UnsavedChangesArgs) {
			if (UnsavedChangesArgs.hasUnsavedChanges)
				considerRegisterBeforeUnload();
			LectioJSUtils.LogDebug('has unsaved changes: ', UnsavedChangesArgs.hasUnsavedChanges);
			let checkunsavedelement = 'body';
			if (UnsavedChangesArgs.definedcontrol != "" && UnsavedChangesArgs.definedcontrol != undefined) {
				if (document.getElementById(UnsavedChangesArgs.definedcontrol) != null) {
					checkunsavedelement = '#' + (UnsavedChangesArgs.definedcontrol as string);
					registerUnsavedBrowserChanges(checkunsavedelement)
				}
				else
					console.warn("DefinedUnsavedChangesWarningControlId does not exist: " + UnsavedChangesArgs.definedcontrol);
			}
			else
				registerUnsavedBrowserChanges(checkunsavedelement);
		}

		$(() => {
			if (!window?.Sys?.Application)
				return;

			let loadedCount = 0;
			let ignoreFirstLoad: boolean;
			const LoadedHandler = (sender: {}, args: {
				get_panelsCreated: () => HTMLElement[],
				get_panelsUpdated: () => HTMLElement[],
			}) => {
				const created = args.get_panelsCreated();
				const updated = args.get_panelsUpdated();
				const all = created.concat(updated);

				// Understøttelse af script-elementer i updatepanel: Sørg for at
				// script-elementer bliver evalueret.
				// Den foerste gang er imidlertid sommetider den foerste GET,
				// hvor browseren selv evaluerer script-elementernes indhold.
				// "sommetider" daekker over at vores event handler ifbm.
				// sideindlaesningen bliver kaldt hvis og kun hvis siden ikke er
				// faerdigindlaest, som maalt paa document.readyState ===
				// 'complete'.
				// Vi noterer det paa script-elementerne om de er blevet
				// evalueret, hvilket burde sikre mod dobbeltevaluering.
				loadedCount++;
				// console.warn('loadedhandler: readystate=', document.readyState, ' loadedcount=', loadedCount);
				if (loadedCount === 1 && ignoreFirstLoad)
					return;

				LCDocumentPresentation.Initialize();

				for (const panel of all) {

					if (window.MathJax)
						window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub, panel]);

					const scripts = panel.getElementsByTagName('script');
					for (const sc of scripts) {
						const evaluatedProp = 'lecmsajax-isevaluated';
						const markedEvaluated = sc.getAttribute(evaluatedProp);
						if (markedEvaluated)
							continue;
						sc.setAttribute(evaluatedProp, 'si');

						const t = sc.getAttribute('type');
						if (!t || t.toLowerCase() === "text/javascript") {
							const toEval = sc.innerText;

							// Evaluér i globalt scope, så funktioner o.a. er synlige efter denne funktion returnerer.
							const f = new Function(toEval);
							f();
						}
					}
				}
			}

			// console.warn('init: readystate=', document.readyState);
			window.Sys.Application.add_init(() => {
				ignoreFirstLoad = document.readyState !== 'complete';
				// console.warn('add_init: readystate=', document.readyState, ' ignorefirstload=' + ignoreFirstLoad);
				const pgRegMgr = window.Sys.WebForms.PageRequestManager.getInstance();
				pgRegMgr.add_pageLoaded(LoadedHandler);
			});
		});
	}
}