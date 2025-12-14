import { serviceworker } from "modernizr";
import { LectioDeferred, LectioJSUtils } from "./LectioJSUtils";

export namespace LectioWebPush {


	export function ShowSampleNotification() {
		const title = 'my title';
		const img = '/lectio/img/defaultfoto_small.jpg'

		const text = `HEY! Your task "${title}" is now overdue.`;
		const notification = new Notification('To do list', { body: text, icon: img });
	}

	const log = LectioJSUtils.CreateLogSource(false);

	// export function AskMe() {
	// 	askNotificationPermission();
	// }

	// export async function initshit(
	// 	applicationServerKey: string, workerFileName: string
	// ): Promise<PushSubscription | undefined> {

	// 	const gotperm = await askNotificationPermission();
	// 	if (!gotperm)
	// 		return;
	// 	const swreg = await registerServiceWorkerAsync(workerFileName);
	// 	await registerPushSubscriptionAsyncImpl(swreg, applicationServerKey);
	// }

	function askNotificationPermission(): Promise<undefined> {
		function checkNotificationPromise(): boolean {
			try {
				Notification.requestPermission().then();
			} catch (e) {
				return false;
			}

			return true;
		}

		// Let's check if the browser supports notifications
		if (!('Notification' in window))
			return Promise.reject("This browser does not support notifications.");

		if (checkNotificationPromise()) {
			const def = LectioJSUtils.CreateDeferred<undefined>();
			Notification.requestPermission().then((permission) => {
				if (permission == 'granted')
					def.resolve(undefined);
				else
					def.reject('Notification permission denied.');

			});
			return def.promise();
		}

		const def = LectioJSUtils.CreateDeferred<undefined>();
		Notification.requestPermission((permission) => {
			if (permission == 'granted')
				def.resolve(undefined);
			else
				def.reject('Notification permission denied.');
		});
		return def.promise();
	}

	let swregPromise: Promise<ServiceWorkerRegistration> | undefined;
	let swregResolvedOrRejected = false;

	export async function registerServiceWorkerAsync(
		workerFileName: string
	): Promise<void> {
		swregPromise ??= registerServiceWorkerAsyncImpl(workerFileName);
		await swregPromise;
	}

	export function getServiceWorkerRegistrationAsync(): Promise<ServiceWorkerRegistration> {
		return swregPromise!;
	}

	async function registerServiceWorkerAsyncImpl(
		workerFileName: string
	): Promise<ServiceWorkerRegistration> {
		const reg = await navigator.serviceWorker.register(workerFileName)
		let serviceWorker;
		if (reg.installing) {
			serviceWorker = reg.installing;
			log.Debug('Service worker installing');
		} else if (reg.waiting) {
			serviceWorker = reg.waiting;
			log.Debug('Service worker installed & waiting');
		} else if (reg.active) {
			serviceWorker = reg.active;
			log.Debug('Service worker active');
		}
		else
			return Promise.reject('Har ikke nogen worker?');
		sw.resolve(serviceWorker);

		if (serviceWorker.state == "activated") {
			// If push subscription wasnt done yet have to do here
			swregResolvedOrRejected = true;
			return reg;
		}

		const def = LectioJSUtils.CreateDeferred<ServiceWorkerRegistration>();
		serviceWorker.addEventListener("statechange", e => {
			const target = e!.target! as ServiceWorker;
			log.Debug("sw statechange : ", target.state);
			if (target.state == "activated") {
				swregResolvedOrRejected = true;
				def.resolve(reg);
			}
		});
		return await def.promise();
	}

	const sw: LectioDeferred<ServiceWorker> = LectioJSUtils.CreateDeferred<ServiceWorker>();

	export async function getServiceWorkerAsync(): Promise<ServiceWorker> {
		if (!sw)
			throw new Error('har ikke sw');
		return await sw.promise();
	}

	export async function registerPushSubscriptionExAsync(
		applicationServerKey: string
	): Promise<PushSubscription> {
		let swreg: ServiceWorkerRegistration | undefined;
		if (swregResolvedOrRejected) {
			if (swregResolvedOrRejected)
				swreg = await swregPromise;
			else
				swreg = undefined;
		}
		else
			swreg = undefined;

		if (!swreg)
			throw new Error('Kan ikke registrere push subscription: Har ikke service worker registration.');

		return await registerPushSubscriptionAsyncImpl(swreg, applicationServerKey);
	}

	// Web-Push
	// Public base64 to Uint
	function urlBase64ToUint8Array(base64String: string): BufferSource {
		const padding = '='.repeat((4 - base64String.length % 4) % 4);
		const base64 = (base64String + padding)
			.replace(/-/g, '+')
			.replace(/_/g, '/');

		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i)
			outputArray[i] = rawData.charCodeAt(i);

		return outputArray;
	}

	async function registerPushSubscriptionAsyncImpl(
		swreg: ServiceWorkerRegistration,
		applicationServerKey: string
	): Promise<PushSubscription> {
		if (!applicationServerKey)
			throw new Error('Har ikke server app key.');

		const subscribeOptions = {
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(
				applicationServerKey
			),
		} satisfies PushSubscriptionOptionsInit;

		const pushSubscription = await swreg.pushManager.subscribe(subscribeOptions);
		log.Debug(
			'Received PushSubscription',
			JSON.stringify(pushSubscription),
		);
		return pushSubscription;
	}
}