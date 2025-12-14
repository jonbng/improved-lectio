// STM: 45441
// Based on: https://amphiluke.github.io/floating-scroll/


export namespace LectioFloatingScroll {
	type FloatingScrollProtoProperties = {
		// Properties with “X” are for cross orientation (relative to the scrollbar orientation)
		ORIENTATION: ScrollDirection;
		SIZE: string;
		X_SIZE: string;
		OFFSET_SIZE: string;
		OFFSET_X_SIZE: string;
		CLIENT_SIZE: string;
		CLIENT_X_SIZE: string;
		INNER_X_SIZE: string;
		SCROLL_SIZE: string;
		SCROLL_POS: string;
		START: string;
		X_START: string;
		X_END: string;
	}

	type ScrollDirection = "horizontal" | "vertical";

	/** Scroll-bar is on the bottom, going left-to-right */
	export const SCROLL_DIRECTION_HORIZONTAL: ScrollDirection = "horizontal";

	/** Scroll-bar is on the right, going top-to-bottom */
	export const SCROLL_DIRECTION_VERTICAL: ScrollDirection = "vertical";

	// Gets parameter struct for initialization based on scroll direction
	function getOrientationProps(orientation: ScrollDirection): FloatingScrollProtoProperties {
		const isHorizontal = orientation === SCROLL_DIRECTION_HORIZONTAL;

		return {
			ORIENTATION: orientation,
			SIZE: isHorizontal ? "width" : "height",
			X_SIZE: isHorizontal ? "height" : "width",
			OFFSET_SIZE: isHorizontal ? "offsetWidth" : "offsetHeight",
			OFFSET_X_SIZE: isHorizontal ? "offsetHeight" : "offsetWidth",
			CLIENT_SIZE: isHorizontal ? "clientWidth" : "clientHeight",
			CLIENT_X_SIZE: isHorizontal ? "clientHeight" : "clientWidth",
			INNER_X_SIZE: isHorizontal ? "innerHeight" : "innerWidth",
			SCROLL_SIZE: isHorizontal ? "scrollWidth" : "scrollHeight",
			SCROLL_POS: isHorizontal ? "scrollLeft" : "scrollTop", 
			START: isHorizontal ? "left" : "top",
			X_START: isHorizontal ? "top" : "left",
			X_END: isHorizontal ? "bottom" : "right"
		};
	};

	// Gets a property from an element based on the name
	function getElementProp(el: HTMLElement, key: string): string | number {
		switch (key) {
			case "width":
				return el.style.width;
			case "height":
				return el.style.height;
			case "offsetWidth":
				return el.offsetWidth;
			case "offsetHeight":
				return el.offsetHeight;
			case "clientWidth":
				return el.clientWidth;
			case "clientHeight":
				return el.clientHeight;
			case "innerHeight":
				return window.getComputedStyle(el, null).getPropertyValue("innerHeight");
			case "innerWidth":
				return window.getComputedStyle(el, null).getPropertyValue("innerWidth");
			case "scrollWidth":
				return el.scrollWidth;
			case "scrollHeight":
				return el.scrollHeight;
			case "scrollLeft":
				return el.scrollLeft;
			case "scrollTop":
				return el.scrollTop;
			case "top":
				return el.style.top;
			case "left":
				return el.style.left;
			case "bottom":
				return el.style.bottom;
			case "right":
				return el.style.right;
			default:
				throw new DOMException("Ehh, what are you trying to get from the elem? " + key);
		}
	}

	// Sets a property on an element based on the name
	function setElementProp(el: HTMLElement, key: string, value: any): void {
		switch (key) {
			case "width":
				el.style.width = value;
				return;
			case "height":
				el.style.height = value;
				return;
			case "scrollLeft":
				el.scrollLeft = value;
				return;
			case "scrollTop":
				el.scrollTop = value;
				return;
			case "top":
				el.style.top = value;
				return;
			case "left":
				el.style.left = value;
				return;
			case "bottom":
				el.style.bottom = value;
				return;
			case "right":
				el.style.right = value;
				return;
			default:
				throw new DOMException("Ehh, what are you trying to set on the elem? " + key + " => " + value);
		}
	}

	// Gets a property from a DOM Rect based on the name
	function getDOMRectProp(rect: DOMRect, key: string): number {
		switch (key) {
			case "top":
				return rect.top;
			case "left":
				return rect.left;
			case "bottom":
				return rect.bottom;
			case "right":
				return rect.right;
			default:
				throw new DOMException("Ehh, what are you trying to get from the rect? " + key);
		}
	}

	class FloatingScrollProto {
		// Properties
		orientationProps: FloatingScrollProtoProperties;

		// The actual scroll bar
		widget: HTMLElement | null = null;

		// The container that scrolls
		container: HTMLElement;

		// An optional block around the container that scrolls (.fl-scrolls-body)
		scrollBody: HTMLElement | null = null;

		// Whether the widget (scrollbar) is visible or not
		visible: boolean;

		// If syncing the scroll positions of the widget to the scroll position of the container can be skipped
		skipSyncWidget: boolean;

		// If syncing the scroll positions of the container to the scroll position of the widget can be skipped
		skipSyncContainer: boolean;

		// List of event handlers to be loaded
		eventHandlers: { el: HTMLElement | Window | null; handlers: {eventName: string, fun: () => void}[]; }[] | null = null;

		public constructor(container: HTMLElement, orientationProps: FloatingScrollProtoProperties) {
			// Store properties
			this.orientationProps = orientationProps;

			// Check if there is a scroll body and store it
			const scrollBody: HTMLElement | null = container.closest(".fl-scrolls-body");
			if (scrollBody && scrollBody.offsetHeight > 0)
				this.scrollBody = scrollBody;

			// Store container
			this.container = container;

			// Scroll bar is visible by default. Will be updated later
			this.visible = true;

			// Create DOM-elements for widget
			this.initWidget();

			// Recalculate scrollbar parameters and set its visibility
			this.updateAPI();

			// Add event handlers to scrollable elements
			this.addEventHandlers();

			// Set skipSync flags to their initial values (because update() above calls syncWidget())
			this.skipSyncContainer = this.skipSyncWidget = false;
		};

		// Creates DOM-elements for widget
		private initWidget(): void {
			const { ORIENTATION, SIZE, SCROLL_SIZE } = this.orientationProps;

			// Create widget
			this.widget = document.createElement('div');
			this.widget.classList.add("fl-scrolls");
			this.widget.dataset.orientation = ORIENTATION;

			// Create inner element with width of actual scrollable element
			const innerDiv = document.createElement('div');
			setElementProp(innerDiv, SIZE, getElementProp(this.container, SCROLL_SIZE));

			// Store elements in DOM
			this.widget.append(innerDiv);
			this.container.append(this.widget);
		};

		// Adds event handlers to scrollable elements
		private addEventHandlers(): void {
			this.eventHandlers = [
				{ // Update scroll position of widget when scrolling in scrollBody
					el: this.scrollBody,
					handlers: [
						// Don’t use `$.proxy()` since it makes impossible event unbinding individually per this
						// (see the warning at http://api.jquery.com/unbind/)
						{
							eventName: "scroll",
							fun: () => {
								this.updateAPI();
							}
						},
						{
							eventName: "resize",
							fun: () => {
								this.updateAPI();
							}
						}
					]
				},
				{ // Update scroll position of widget when scrolling in window
					el: window,
					handlers: [
						// Don’t use `$.proxy()` since it makes impossible event unbinding individually per this
						// (see the warning at http://api.jquery.com/unbind/)
						{
							eventName: "scroll",
							fun: () => {
								this.updateAPI();
							}
						},
						{
							eventName: "resize",
							fun: () => {
								this.updateAPI();
							}
						}
					]
				},
				{// Update scroll position of scrollBody when scrolling in widget
					el: this.widget,
					handlers: [
						{
							eventName: "scroll",
							fun: () => {
								if (this.visible && !this.skipSyncContainer) {
									this.syncContainer();
								}
								// Resume widget->container syncing after the widget scrolling has finished
								// (it might be temporally disabled by the container while syncing the widget)
								this.skipSyncContainer = false;
							}
						}
					]
				},
				{ // Update scroll position when scrolling in or focussing on container
					el: this.container,
					handlers: [
						{
							eventName: "scroll",
							fun: () => {
								if (!this.skipSyncWidget) {
									this.syncWidget();
								}
								// Resume container->widget syncing after the container scrolling has finished
								// (it might be temporally disabled by the widget while syncing the container)
								this.skipSyncWidget = false;
							}
						},
						{
							eventName: "focusin",
							fun: () => {
								setTimeout(() => {
									// The widget might be destroyed before the timer is triggered (Amphiluke/handy-scroll#14)
									if (this.widget) {
										this.syncWidget();
									}
								}, 0);
							}
						},
						{
							eventName: "update.fscroll",
							fun: () => {
								this.updateAPI();
							}
						},
						{
							eventName: "destroy.fscroll",
							fun: () => {
								this.destroyAPI();
							}
						}
					]
				}
			];

			// Add event listeners to respective elements
			this.eventHandlers.forEach(({ el, handlers }) => {
				handlers.forEach(({ eventName, fun }) => {
					el?.addEventListener(eventName, fun);
				})
			});
		};

		// Checks if the floating scrollbar should be visible, or if the regular one is already shown
		private checkVisibility(): void {
			const { widget, container } = this;
			const { SCROLL_SIZE, OFFSET_SIZE, X_START, X_END, INNER_X_SIZE, CLIENT_X_SIZE } = this.orientationProps;
			let mustHide = widget && (getElementProp(widget, SCROLL_SIZE) <= getElementProp(widget, OFFSET_SIZE));
			if (!mustHide) {
				const containerRect = container.getBoundingClientRect();
				const maxVisibleCrossEnd = (INNER_X_SIZE == "innerHeight" ? window.innerHeight : null)
					|| (INNER_X_SIZE == "innerWidth" ? window.innerWidth : null)
					|| (CLIENT_X_SIZE == "clientHeight" ? document.documentElement.clientHeight : null)
					|| document.documentElement.clientWidth;

				mustHide = ((getDOMRectProp(containerRect, X_END) < maxVisibleCrossEnd) || (getDOMRectProp(containerRect, X_START) > maxVisibleCrossEnd));
			}
			if (widget && this.visible === mustHide) {
				this.visible = !mustHide;
				// We cannot simply hide the scrollbar since its scroll position won’t update in that case
				widget.classList.toggle("fl-scrolls-hidden");
			}
		};

		// Syncs the scroll positions of the container to the scroll position of the widget
		public syncContainer(): void {
			const { SCROLL_POS } = this.orientationProps;
			const scrollPos = this.widget == null ? null : getElementProp(this.widget, SCROLL_POS);
			if (scrollPos && getElementProp(this.container, SCROLL_POS) !== scrollPos) {
				// Prevents container’s “scroll” event handler from syncing back again widget scroll position
				this.skipSyncWidget = true;
				// Note that this makes container’s “scroll” event handlers execute
				setElementProp(this.container, SCROLL_POS, scrollPos);
			}
		};
		
		// Syncs the scroll positions of the widget to the scroll position of the container
		public syncWidget(): void {
			const { SCROLL_POS } = this.orientationProps;
			const scrollPos = getElementProp(this.container, SCROLL_POS);
			if (this.widget && scrollPos && getElementProp(this.widget, SCROLL_POS) !== scrollPos) {
				// Prevents widget’s “scroll” event handler from syncing back again container scroll position
				this.skipSyncContainer = true;
				// Note that this makes widget’s “scroll” event handlers execute
				setElementProp(this.widget, SCROLL_POS, scrollPos);
			}
		};

		// Recalculate scroll width/height and container boundaries
		public updateAPI(): void {
			const { SIZE, X_SIZE, OFFSET_X_SIZE, CLIENT_SIZE, CLIENT_X_SIZE, SCROLL_SIZE, START } = this.orientationProps;
			const { widget, container, scrollBody } = this;
			const clientSize = getElementProp(container, CLIENT_SIZE);
			const scrollSize = getElementProp(container, SCROLL_SIZE);

			if (widget) {
				setElementProp(widget, SIZE, clientSize + "px");

				const val = getDOMRectProp(container.getBoundingClientRect(), START);
				setElementProp(widget, START, `${val}px`);

				if (widget.querySelector("div"))
					setElementProp(widget!.querySelector("div")!, SIZE, scrollSize + "px");
			}

			// Fit widget size to the native scrollbar size if needed
			if (scrollSize > clientSize && widget) {
				setElementProp(widget, X_SIZE, ((getElementProp(widget, OFFSET_X_SIZE) as number) - (getElementProp(widget, CLIENT_X_SIZE) as number) + 1) + "px"); // +1px JIC
			}

			this.syncWidget();
			this.checkVisibility(); // fixes issue #2
		};

		// Remove a scrollbar and all related event handlers
		public destroyAPI(): void {
			this.eventHandlers?.forEach(({ el, handlers }) => {
				handlers.forEach(({ eventName, fun }) => {
					el?.removeEventListener(eventName, fun);
				});
			});
			this.widget?.remove();
			this.eventHandlers = this.widget = this.scrollBody = null;
		};
	};

	/** Gives the element a floating scrollbar in the given direction */
	export function init(elem: HTMLElement, scrollDirection: ScrollDirection): FloatingScrollProto {
		return new FloatingScrollProto(elem, getOrientationProps(scrollDirection));
	};
}

//// Sæt automatisk på alle elementer med data-parameter sat
//$(() => {
//	$("body [data-fl-scrolls-horizontal]").each((index, el) => {
//		LectioFloatingScroll.init(el, LectioFloatingScroll.SCROLL_DIRECTION_HORIZONTAL);
//	});
//	$("body [data-fl-scrolls-vertical]").each((index, el) => {
//		LectioFloatingScroll.init(el, LectioFloatingScroll.SCROLL_DIRECTION_VERTICAL);
//	});
//});