import { JSErrorHandling } from "./JSErrorHandling";
import { LectioCookie } from "./LectioCookie";
import { LectioJSUtils } from "./LectioJSUtils";

export class SessionHelper {
	private _schoolId: number | null = null;
	private _secondsUntilWarning: number | null = null;
	private _secondsUntilTimeout: number | null = null;
	private _currentlyShowingWarningDialog: JQuery | null = null;
	private _currentlyShowingTimeoutDialog: JQuery | null = null;
	private _isSuspended = false;
	private sessionCheckIntervalId: number | null = null;

	public SetLastAuthenticatedPageLoad(now: Date | null): void {
		if (now === null) {
			LectioCookie.deleteCookieGlobal('LastAuthenticatedPageLoad2');
		}
		else {
			const s2 = now.getTime().toString();
			LectioCookie.setCookieGlobal('LastAuthenticatedPageLoad2', s2);
		}
	}

	private GetLastAuthenticatedPageLoad(): Date | null {
		const s = LectioCookie.getCookie('LastAuthenticatedPageLoad2');
		if (!s) {
			return null;
		}

		const num = Number.parseInt(s);
		if (isNaN(num)) {
			JSErrorHandling.reportJSError('LastAuthenticatedPageLoad: NaN: "' + s + '"');
			return null;
		}

		const d = new Date();
		d.setTime(num);
		return d;
	}

	private GetIsLoggedIn(): boolean {
		const val = LectioCookie.getCookie('isloggedin3');
		return val === 'Y';
	}

	private SetIsLoggedIn(isLoggedIn: boolean) {
		if (typeof (isLoggedIn) !== 'boolean') {
			JSErrorHandling.reportJSError(`SetIsLoggedIn(${isLoggedIn})`);
		}
		if (isLoggedIn === true)
			LectioCookie.setCookieGlobal('isloggedin3', 'Y');
		else
			LectioCookie.deleteCookieGlobal('isloggedin3');
	}

	private GetSchoolId() {
		const schoolId = parseInt(LectioCookie.getCookie('BaseSchoolUrl') || '');
		return isNaN(schoolId) ? null : schoolId;
	}
	private SetSchoolId(schoolId: number) {
		LectioCookie.setCookieGlobal('BaseSchoolUrl', schoolId.toString());
	}

	private createWarningDialogCount = 0;
	private pingStartCount = 0;
	private pingCompleteCount = 0;
	private pingCompleteCount2 = 0;
	private hasStartedRedirecting = false;

	public SetIsSuspended(suspended: boolean) {
		this._isSuspended = suspended;
	}

	public HasStartedRedirecting(): boolean {
		return this.hasStartedRedirecting;
	}

	public ShowWarningDialog() {
		if (this._currentlyShowingWarningDialog !== null)
			LectioJSUtils.LogDebug("ShowWarningDialog: Dialog != null");

		const elem = $("<div style='text-align: center'>" +
			"<h3>Din session udløber snart.</h3>" +
			"<p>Klik herunder for at forlænge sessionen.</p>" +
			"</div>").appendTo('body');

		this.createWarningDialogCount++;

		const d: JQuery = elem.dialog({
			title: "Sessionsudløb",
			resizable: false,
			buttons: [
				{
					text: "Forlæng session",
					click: () => {
						if (!d.is(':visible'))
							return;

						this.pingStartCount++;
						if (this.pingStartCount === 5 && Math.random() < 0.10) {
							JSErrorHandling.reportJSError("Mange ping-kald fra denne side.\r\n" +
								"createWarningDialogCount: " + this.createWarningDialogCount + "\r\n" +
								"pingStartCount: " + this.pingStartCount + "\r\n" +
								"pingCompleteCount: " + this.pingCompleteCount + "\r\n" +
								"pingCompleteCount2: " + this.pingCompleteCount2);
						}

						$.get(LectioJSUtils.GetBaseSchoolURL() + "/ping.aspx", () => {
							this.pingCompleteCount++;
							this._currentlyShowingWarningDialog = null;
							this.SetLastAuthenticatedPageLoad(new Date());
							d.dialog('close');
							this.pingCompleteCount2++;
						});
					}
				}
			],
			close: () => {

			}
		});
		this._currentlyShowingWarningDialog = d;
	}

	public ShowTimeoutDialog() {
		if (this._currentlyShowingTimeoutDialog !== null) {
			LectioJSUtils.LogDebug("ShowTimeoutDialog: Dialog != null");
		}
		const elem = $("<div style='text-align: center'>" +
			"<h3>Din session er udløbet.</h3>" +
			"<p>Klik herunder for at genindlæse siden. </p>" +
			"</div>").appendTo('body');

		$("[id*='m_outerContentFrameDiv']").empty();
		const d = elem.dialog({
			title: "Session udløbet",
			resizable: false,
			buttons: [
				{
					text: "Ok",
					click: () => {
						if (!d.is(':visible'))
							return;
						location.reload();
					}
				}
			],
			close: () => {
				location.reload();
			}
		});
		this._currentlyShowingTimeoutDialog = d;
	}

	private Redirect(path: string): void {
		this.hasStartedRedirecting = true;
		if (this.sessionCheckIntervalId)
			window.clearInterval(this.sessionCheckIntervalId);
		window.location.href = LectioJSUtils.GetBaseSchoolURL() + path;
	}

	private TimerSessionCheck() {
		if (this._isSuspended) {
			return;
		}

		{
			const isLoggedIn = this.GetIsLoggedIn();
			//if (isLoggedIn === null) {
			//	// Kagen kan gå hen forsvinde eller bliver tom?? I så fald dropper vi bare sessionsforlængeren.
			//	if (this.sessionCheckIntervalId !== null) {
			//		window.clearInterval(this.sessionCheckIntervalId);
			//		this.sessionCheckIntervalId = null;
			//	}
			//	SessionHelper.log("Sessionsforlænger: Droppes pga. manglende/tom/ugyldig cookie.");
			//	return;
			//}
			if (!isLoggedIn) {
				this.Redirect("/default.aspx");
				return;
			}
		}

		// tjek om vi i mellemtiden er logget ind på en anden skole.
		const schoolIdFromSession = this.GetSchoolId();
		if (schoolIdFromSession && this._schoolId && (schoolIdFromSession !== this._schoolId)) {
			LectioJSUtils.LogDebug("Sessionsforlænger: baseSchoolUrlFromSession changed.");
			this.Redirect("/default.aspx");
			return;
		}

		const lastLoad = this.GetLastAuthenticatedPageLoad();
		if (!lastLoad) {
			return;
		}

		const now = new Date();
		const idleSeconds = (now.getTime() - lastLoad.getTime()) / 1000;

		if (idleSeconds >= this._secondsUntilTimeout!) {
			if (this._currentlyShowingTimeoutDialog) {
				return;
			}
			if (this._currentlyShowingWarningDialog) {
				this._currentlyShowingWarningDialog.dialog('close');
				this._currentlyShowingWarningDialog = null;
			}
			this.ShowTimeoutDialog();
		}

		else if (idleSeconds >= this._secondsUntilWarning!) {
			if (this._currentlyShowingWarningDialog) {
				return;
			}
			this.ShowWarningDialog();
		}

		else if (this._currentlyShowingWarningDialog) {
			this._currentlyShowingWarningDialog.dialog('close');
			this._currentlyShowingWarningDialog = null;
		}
		else if (this._currentlyShowingTimeoutDialog) {
			this._currentlyShowingTimeoutDialog.dialog('close');
			this._currentlyShowingTimeoutDialog = null;
		}
	}

	public static Initialize(isLoggedIn: boolean, schoolId: number, secondsUntilWarning: number, secondsUntilTimeout: number) {
		if (SessionHelper.Instance)
			LectioJSUtils.LogDebug("Warning: Re-initializing SessionHelper.");

		SessionHelper.Instance = new SessionHelper(isLoggedIn, schoolId, secondsUntilWarning, secondsUntilTimeout);
	}

	static Instance: SessionHelper;

	constructor(isLoggedIn: boolean, schoolId: number, secondsUntilWarning: number, secondsUntilTimeout: number) {
		this.SetIsLoggedIn(isLoggedIn);

		if (isLoggedIn) {
			this._schoolId = schoolId;
			this._secondsUntilWarning = secondsUntilWarning;
			this._secondsUntilTimeout = secondsUntilTimeout;

			const cookieBefore = document.cookie;
			this.SetSchoolId(schoolId);

			// Mærkelig og sjælden fejl.
			if (this.GetSchoolId() !== schoolId) {
				JSErrorHandling.reportJSError("Sessionsforlænger: Kunne ikke sætte BaseSchoolUrl.",
					`Satte '${schoolId}', fik '${this.GetSchoolId()}'. Cookie før: '${cookieBefore}'. Cookie efter: '${document.cookie}'.`);
				return;
			}

			this.SetLastAuthenticatedPageLoad(new Date());
			this.sessionCheckIntervalId = window.setInterval(() => this.TimerSessionCheck(), 2000);
		}
		else {
			this.SetLastAuthenticatedPageLoad(null);
		}
	}
}