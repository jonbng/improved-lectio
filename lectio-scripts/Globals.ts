declare global {
	interface Window {
		WebForm_FireDefaultButton: (e: Event, target: any) => boolean;
		__doPostBack: (target: string, commandArgument: string) => void;
		WebForm_DoPostBackWithOptions: (options: any) => void;

		WebForm_AutoFocus: (id: string) => void;
		WebForm_CanFocus: (el: HTMLElement) => boolean;
		WebForm_FindFirstFocusableChild: (el: HTMLElement) => HTMLElement;
		Page_ClientValidate?: (group: string) => boolean;
		Page_Validators?: HTMLElement & { controltovalidate: string, isvalid: boolean }[];
		Sys: any;

		WebForm_RestoreScrollPosition: () => void;
		WebForm_SaveScrollPositionOnSubmit: () => boolean;
		WebForm_SaveScrollPositionSubmit: () => boolean;
		theForm: IAspNetForm;

		loginfotimeout: number | null;
		MathJax?: {
			Hub: {
				Queue: (args: ['Typeset', {}, HTMLElement | string]) => void
			}
		};

		clipboardData: {
			setData: (type: 'Text', data: string) => void
		};

		WakeLockManager: WakeLockManager;
	}
}

export enum PageHistoryBehavior {
	PrevUrl = 1,
	HandsOff = 2,
	ReplacePost = 3,
}

export interface IAspNetForm extends HTMLFormElement {
	oldOnSubmit?: () => boolean;
	oldSubmit?: () => boolean;
	oldOnLoad?: () => boolean;
	__EVENTTARGET?: HTMLInputElement;
	__EVENTARGUMENT?: HTMLInputElement;
	LectioPostbackId?: HTMLInputElement;
	__SCROLLPOSITION: HTMLInputElement;
}

export interface ScrollPosition {
	tableId: string;
	rowIndex: number;
	rowScreenOffsetTop: number;
	rowScreenOffsetLeft: number;
	pixelScrollTop: number;
	pixelScrollLeft: number;
}

interface WakeLockSentinel extends EventTarget {
    readonly released: boolean;
    readonly type: 'screen';
    release(): Promise<void>;
}

class WakeLockManager {
    private wakeLock: WakeLockSentinel | null = null;
    private isEnabled: boolean = false;

    public async enable(): Promise<void> {
        if (this.isEnabled) return;
        
        this.isEnabled = true;
        await this.request();
        
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    private async request(): Promise<void> {
        if (!this.isEnabled) return;
        
        if ('wakeLock' in navigator) {
            try {
				this.wakeLock = await (navigator).wakeLock.request('screen');
				// console.log('Wake Lock active');

				// this.wakeLock.addEventListener('release', () => {
				// 	console.log('Wake Lock released');
				// });

            } catch (err) {
                if (err instanceof Error) {
                    console.error('Wake Lock error:', err.name, err.message);
                }
            }
        } else {
            //console.warn('Wake Lock API not supported');
        }
    }

    private async release(): Promise<void> {
        if (this.wakeLock !== null) {
            await this.wakeLock.release();
            this.wakeLock = null;
        }
    }

    private handleVisibilityChange = (): void => {
        if (document.visibilityState === 'visible' && this.isEnabled) {
            this.request();
        }
    }

    private handleBeforeUnload = (): void => {
        this.isEnabled = false;
        this.release();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
}

// hmm, er det her man skal instantiere den?
window.WakeLockManager = new WakeLockManager();
