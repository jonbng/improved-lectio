import {LectioMobile} from "./LectioMobile";

export class AktivitetForsideHomeworkDD {

	private static containerMargin = 15;

	//tillader omorganizering af elementer i container, husker positionerne i hiddenFieldId og trigger click på btnId
	static init(containerId: string, btnId: string, hiddenFieldId: string) {

		$(document).ready(() => {
			//$.iPhone.init();

			const container = $('#' + containerId);
			const rows = $('.homeworkContainer', container);
			if (rows.length === 0)
				return;

			rows.css('cursor', 'move');
			LectioMobile.addTouch(container);

			const containmentDiv = $("<div></div>");

			$(document.body).append(containmentDiv);

			containmentDiv.css({
				position: 'absolute',
				'z-index': -1,
			});

			containmentDiv.height(container.height() as number + 2 * this.containerMargin);
			containmentDiv.width(container.width() as number);

			const containerpos = container.offset();

			const containmentPos = {
				top: containerpos!.top - this.containerMargin,
				left: containerpos!.left
			};
			containmentDiv.offset(containmentPos);

			container.sortable({
				//cursor: "move",
				//containment: "parent",
				containment: containmentDiv,
				update: () => {
					const positions: string[] = [];

					const homeworkRows = $('.homeworkContainer', container);

					$.each(homeworkRows, (idx, r) => {
						const id = r.getAttribute('data-homeworkid');
						if (!id) {
							throw new Error('Attribut data-homeworkid ikke angivet på element.');
						} else {
							positions.push(id);
						}
					});

					const data = positions.join(',');

					const hf = $('#' + hiddenFieldId);
					hf.val(data);

					window.__doPostBack(btnId, '');
				}
			});
		});
	}
}
