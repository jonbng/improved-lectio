import {PostBackHelper} from "./PostBackHelper";

export class LectioGestureSupport {
	private static isGesturesEnabled: boolean | null = null;
	private static isEngaged = false;

	private static IsEnabled(): boolean {
		if (!LectioGestureSupport.isEngaged)
			return false;
		if (LectioGestureSupport.isGesturesEnabled === null) {
			LectioGestureSupport.isGesturesEnabled =
				!!navigator.userAgent.match(/ipad/i) ||
				!!navigator.userAgent.match(/android/i) ||
				false;
		}
		return LectioGestureSupport.isGesturesEnabled ? LectioGestureSupport.isGesturesEnabled : false;
	}

	public static Initialize() {
		LectioGestureSupport.isEngaged = true;

		if (!LectioGestureSupport.IsEnabled()) {
			return;
		}

		const target = $('body');
		if (!target.attr('id')) {
			$('body').attr('id', 'body1');
		}

		target[0].ontouchstart = event => {
			LectioGestureSupport.touchStart(event as TouchEvent, "body1");
		};
		target[0].ontouchend = event => {
			LectioGestureSupport.touchEnd(event as TouchEvent);
		};
		target[0].ontouchmove = event => {
			LectioGestureSupport.touchMove(event as TouchEvent);
		};
		target[0].ontouchcancel = event => {
			LectioGestureSupport.touchCancel(event as TouchEvent);
		};

		$('body').on('swipeleft', () => {
				const link = $('a[data-nav=next]');
				if (link.length === 1 && link.attr('disabled') !== 'disabled') {
					{
						PostBackHelper.Customize(10, "Næste kapitel loader");
						link.click();
					}
				}
			});
		$('body').on('swiperight', () => {
				const link = $('a[data-nav=previous]');
				if (link.length === 1 && link.attr('disabled') !== 'disabled') {
					{
						PostBackHelper.Customize(10, "Forrige kapitel loader");
						link.click();
					}
				}
			});
	}

	private static processingRoutine() {
		const direction = LectioGestureSupport.swipeDirection;

		//alert(direction);

		if (direction === 'left') {
			$('body').trigger('swipeleft');
		} else if (direction === 'right') {
			$('body').trigger('swiperight');
		}
	}

	// TOUCH-EVENTS SINGLE-FINGER SWIPE-SENSING JAVASCRIPT
	// Courtesy of PADILICIOUS.COM and MACOSXAUTOMATION.COM

	// this script can be used with one or more page elements to perform actions based on them being swiped with a single finger

	private static triggerElementID: string | null = null; // this variable is used to identity the triggering element
	private static fingerCount: number = 0;
	private static startX = 0;
	private static startY = 0;
	private static curX = 0;
	private static curY = 0;
	private static deltaX = 0;
	private static deltaY = 0;
	private static horzDiff = 0;
	private static vertDiff = 0;
	private static minLength = 72; // the shortest distance the user may swipe
	private static swipeLength = 0;
	private static swipeAngle: number | null = null;
	private static swipeDirection: 'left' | 'right' | 'up' | 'down' | null = null;

	// The 4 Touch Event Handlers

	// NOTE: the touchStart handler should also receive the ID of the triggering element
	// make sure its ID is passed in the event call placed in the element declaration, like:
	// <div id="picture-frame" ontouchstart="touchStart(event,'picture-frame');"  ontouchend="touchEnd(event);" ontouchmove="touchMove(event);" ontouchcancel="touchCancel(event);">

	private static touchStart(event: TouchEvent, passedName: string) {
		// disable the standard ability to select the touched object
		//			event.preventDefault();
		// get the total number of fingers touching the screen
		LectioGestureSupport.fingerCount = event.touches.length;
		// since we're looking for a swipe (single finger) and not a gesture (multiple fingers),
		// check that only one finger was used
		if (LectioGestureSupport.fingerCount === 1) {
			// get the coordinates of the touch
			LectioGestureSupport.startX = event.touches[0].pageX;
			LectioGestureSupport.startY = event.touches[0].pageY;
			// store the triggering element ID
			LectioGestureSupport.triggerElementID = passedName;
		} else {
			// more than one finger touched so cancel
			LectioGestureSupport.touchCancel(event);
		}
	}

	private static touchMove(event: TouchEvent) {
		//		event.preventDefault();
		if (event.touches.length === 1) {
			LectioGestureSupport.curX = event.touches[0].pageX;
			LectioGestureSupport.curY = event.touches[0].pageY;
		} else {
			LectioGestureSupport.touchCancel(event);
		}
	}

	private static touchEnd(event: TouchEvent) {
		//			event.preventDefault();
		// check to see if more than one finger was used and that there is an ending coordinate
		if (LectioGestureSupport.fingerCount === 1 && LectioGestureSupport.curX !== 0) {
			// use the Distance Formula to determine the length of the swipe
			LectioGestureSupport.swipeLength = Math.round(Math.sqrt(Math.pow(LectioGestureSupport.curX - LectioGestureSupport.startX, 2) + Math.pow(LectioGestureSupport.curY - LectioGestureSupport.startY, 2)));
			// if the user swiped more than the minimum length, perform the appropriate action
			if (LectioGestureSupport.swipeLength >= LectioGestureSupport.minLength) {
				LectioGestureSupport.caluculateAngle();
				LectioGestureSupport.determineSwipeDirection();
				LectioGestureSupport.processingRoutine();
				LectioGestureSupport.touchCancel(event); // reset the variables
			} else {
				LectioGestureSupport.touchCancel(event);
			}
		} else {
			LectioGestureSupport.touchCancel(event);
		}
	}

	private static touchCancel(event: TouchEvent) {
		// reset the variables back to default values
		LectioGestureSupport.fingerCount = 0;
		LectioGestureSupport.startX = 0;
		LectioGestureSupport.startY = 0;
		LectioGestureSupport.curX = 0;
		LectioGestureSupport.curY = 0;
		LectioGestureSupport.deltaX = 0;
		LectioGestureSupport.deltaY = 0;
		LectioGestureSupport.horzDiff = 0;
		LectioGestureSupport.vertDiff = 0;
		LectioGestureSupport.swipeLength = 0;
		LectioGestureSupport.swipeAngle = null;
		LectioGestureSupport.swipeDirection = null;
		LectioGestureSupport.triggerElementID = null;
	}

	private static caluculateAngle() {
		const X = LectioGestureSupport.startX - LectioGestureSupport.curX;
		const Y = LectioGestureSupport.curY - LectioGestureSupport.startY;
		const Z = Math.round(Math.sqrt(Math.pow(X, 2) + Math.pow(Y, 2))); //the distance - rounded - in pixels
		const r = Math.atan2(Y, X); //angle in radians (Cartesian system)
		LectioGestureSupport.swipeAngle = Math.round(r * 180 / Math.PI); //angle in degrees
		if (LectioGestureSupport.swipeAngle < 0) {
			LectioGestureSupport.swipeAngle = 360 - Math.abs(LectioGestureSupport.swipeAngle);
		}
	}

	private static determineSwipeDirection() {
		if (LectioGestureSupport.swipeAngle == null)
			throw new Error('swipeAngle er null');
		if ((LectioGestureSupport.swipeAngle <= 45) && (LectioGestureSupport.swipeAngle >= 0)) {
			LectioGestureSupport.swipeDirection = 'left';
		} else if ((LectioGestureSupport.swipeAngle <= 360) && (LectioGestureSupport.swipeAngle >= 315)) {
			LectioGestureSupport.swipeDirection = 'left';
		} else if ((LectioGestureSupport.swipeAngle >= 135) && (LectioGestureSupport.swipeAngle <= 225)) {
			LectioGestureSupport.swipeDirection = 'right';
		} else if ((LectioGestureSupport.swipeAngle > 45) && (LectioGestureSupport.swipeAngle < 135)) {
			LectioGestureSupport.swipeDirection = 'down';
		} else {
			LectioGestureSupport.swipeDirection = 'up';
		}
	}
}
