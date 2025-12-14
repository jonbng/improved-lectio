//Lidt meget basic LectioMobile. Mapper touch* events til 'normale' mouse events
export class LectioMobile {
	public static addTouch(elem: JQuery) {
		elem.each((_, el: HTMLElement) => {
			$(el).on('touchstart touchmove touchend touchcancel',
				(evt) => {
					//we pass the original event object because the jQuery event
					//object is normalized to w3c specs and does not provide the TouchList
					handleTouch(<TouchEvent>(evt as any));
				});
		});

		const handleTouch = (event: TouchEvent) => {
			const touches = event.changedTouches,
				first = touches[0];
			let type = '';

			switch (event.type) {
			case 'touchstart':
				type = 'mousedown';
				break;

			case 'touchmove':
				type = 'mousemove';
				break;

			case 'touchend':
				type = 'mouseup';
				break;

			default:
				return;
			}

			const simulatedEvent = document.createEvent('MouseEvent');
			simulatedEvent.initMouseEvent(type,
				true,
				true,
				window,
				1,
				first.screenX,
				first.screenY,
				first.clientX,
				first.clientY,
				false,
				false,
				false,
				false,
				0 /*left*/,
				null);

			first.target.dispatchEvent(simulatedEvent);

			event.preventDefault();
		};
	}
}