export class LectioButton {
	public static EnsureHiddenInputForPostback(buttonElement: HTMLElement, uniqueId: string) {
		let input = $('*[name="' + uniqueId + '"]');
		if (input.length === 0) {
			input = $('<input type="hidden" name="' + uniqueId + '" value="1" />');
			$(buttonElement).after(input);
		}
	}
}


export namespace HelpTipButton {
	export function helpTipClick(headerText: string, isMacom: boolean) {
		const helpTip = $('#pageHelpTipOpenBtn'); 
		if (helpTip.length) {
			helpTip.click();
			if (headerText != "") {
				const iFrameEle = document.getElementById('helptipIframeId') as HTMLIFrameElement;
				// Iframe elements staten er måske ikke loaded
				// Der sættes derfor et interval, hvor vi kører 10 iterationer.
				const maxInteravals = 10;
				let currentIntervalNum = 0;
				const intervalId = setInterval(function () {
					currentIntervalNum++;
					const iframeDocument = iFrameEle.contentDocument || iFrameEle.contentWindow?.document;
					if (iframeDocument != null && iframeDocument.readyState === 'complete') {
						clearInterval(intervalId);
						const headerElements = $(iframeDocument).find(':header');
						let isFound = false;

						if (isMacom) {
							const duplicates: string[] = [];
							const uniqueItems = new Set();

							headerElements.each(function () {
								const text = $(this).text();
								if (uniqueItems.has(text)) {
									if (!duplicates.includes(text)) {
										duplicates.push(text);
									}
								} else {
									uniqueItems.add(text);
								}
							});
							if(duplicates.length > 0)
								alert(`Der er duplikater for header titlerne: ${duplicates.join(', ')}`);
						}

						// Hvis der er duplicates hoppes der hen til den første header.
						headerElements.each(function () {
							if ($(this).text().toLowerCase() == headerText.toLowerCase()) {
								$(this)[0].scrollIntoView();
								isFound = true;
								return false;
							}
							return;
						});
						if (isMacom && !isFound) {
							alert(`Der findes ingen header med titlen: ${headerText}`);
						}
						return;
					}
					else if (maxInteravals == currentIntervalNum) {
						clearInterval(intervalId);
						if (isMacom)
							alert("Kunne ikke finde hjælpeteksen efter 10 iterationer.");
					}
				}, 500);
			}
		}
		else {
			if (isMacom) {
				alert('Der mangler at oprette en hjælpetekst på siden.');
			}
			return;
		} 
	}
}