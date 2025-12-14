/// <reference types="jsqr"/>

import jsQR from "jsqr";
import { LectioCookie } from "./LectioCookie";

export namespace QRScanner {
	type LastQrScan = {
		data: string | null,
		datetime: number
	}

	let scanner: QRScanner | null;
	let audioElement: HTMLAudioElement | null = null;

	export function Initialize(scanHandlerClientId: string, videoId: string, canvasId: string, startOverlayId: string) {
		// prevent screen dimming
		window.WakeLockManager.enable();

		if (!scanner) {
			scanner = new QRScanner(scanHandlerClientId, videoId, canvasId, startOverlayId);
		}

		scanner.setupStartOverlay();

		document.addEventListener("visibilitychange", handleVisibilityChange);
		document.addEventListener('onbeforeunload', handleBeforeUnload);
	}

	async function handleVisibilityChange() {
		if (document.hidden) {
			await scanner!.stopCamera();
		} else {
			scanner!.setupStartOverlay();
		}
	}

	async function handleBeforeUnload() {
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		window.removeEventListener('beforeunload', handleBeforeUnload);
		await scanner!.stopCamera();
	}

	export function PrepareForNextScan() {
		scanner!.clearLastQrData();
	}

	export function DebugShowCameraInfo() {
		scanner!.debugShowCameraInfo = true;
	}

	export function PlaySound(src: string) {
		if (!audioElement) {
			audioElement = new Audio();
			audioElement.volume = 1.0;
		}

		audioElement.src = src;
		audioElement.currentTime = 0;

		const playPromise = audioElement.play();
		if (playPromise !== undefined) {
			playPromise.catch(err => {
				console.warn("Audio play failed:", err);
			});
		}
	}

	class QRScanner {
		public video: HTMLVideoElement;
		private canvas: HTMLCanvasElement;
		private context: CanvasRenderingContext2D;
		private scanHandlerClientId: string;

		private startOverlay: HTMLDivElement;
		private startButton: HTMLButtonElement;
		private isCameraStarted: boolean = false;
		public currentCameraDeviceIndex: number | null = null;
		public cameraDevices: MediaDeviceInfo[] | null = null;
		private mediaStream: MediaStream | null = null;

		private lastQrData: LastQrScan | null = null;
		private scanInterval: number | null = null;
		private cameraRadioButtons: HTMLInputElement[] = [];

		public debugShowCameraInfo: boolean = false;

		constructor(clientID: string, videoId: string, canvasId: string, startOverlayId: string) {
			this.video = document.getElementById(videoId) as HTMLVideoElement;
			this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
			this.startOverlay = document.getElementById(startOverlayId) as HTMLDivElement;
			this.startButton = this.startOverlay.querySelector('#startButton') as HTMLButtonElement;

			this.video.controls = false;

			this.context = this.canvas.getContext("2d", { willReadFrequently: true })!;
			this.scanHandlerClientId = clientID;

			this.getBackFacingCameraDeviceInfos()
				.then(mdis => {
					this.cameraDevices = mdis;
					this.currentCameraDeviceIndex = this.getSavedCurrentCameraDeviceIndex() ?? 0;
					if (this.currentCameraDeviceIndex > this.cameraDevices.length - 1) {
						this.currentCameraDeviceIndex = 0;
					}
				})
				.catch(e => {
					this.cameraDevices = null;
					this.currentCameraDeviceIndex = null;
				});
		}

		public setupStartOverlay() {
			this.startButton.onclick = () => {
				this.startCamera();
				this.startOverlay.style.display = 'none';
			};

			if (!this.isCameraStarted) {
				this.startOverlay.style.display = 'flex';
			} else {
				this.startOverlay.style.display = 'none';
			}
		}

		private getSavedCurrentCameraDeviceIndex(): number | undefined {
			const cv = LectioCookie.getCookie("currentCameraDeviceIndex");
			if (cv) {
				return Number.parseInt(cv);
			}
			return undefined;
		}

		private saveCurrentCameraDeviceIndex() {
			if (this.currentCameraDeviceIndex != null) {
				LectioCookie.setCookieGlobal("currentCameraDeviceIndex", this.currentCameraDeviceIndex.toString());
			}
		}

		private async getBackFacingCameraDeviceInfos(): Promise<MediaDeviceInfo[]> {
			try {
				// noedvendigt at spoerge her for at få tilladelse til at kunne enumerere kamera-infos.
				const tmpstream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
				tmpstream.getTracks().forEach(t => t.stop());

				const devices = await navigator.mediaDevices.enumerateDevices();
				const videoDevices = devices.filter(device => device.kind === 'videoinput');

				// bruger disse "kameraer", hvis de er mulige at vaelge
				const preferedLabels = ["triple"];
				// labels indeholdende disse er vi ret sikre paa vi ikke er intresserede i.
				const excludeLabels = ["front", "forside", "wide", "vidvinkel", "teleobjektiv"];

				const prefered = videoDevices
					.filter(d => preferedLabels.some(pl => d.label.toLowerCase().includes(pl)));

				// har vi praecis et kamera der er i vores prefered liste bruger vi det.
				// F.eks på iphone er kameraet/devices med labelet indeholdende "triple", det ønskede kamera. Da det i virkeligheden er en kombination af alle bagsidekameraerne.
				if (prefered.length == 1) {
					return prefered;
				}

				return videoDevices
					.filter(d => !excludeLabels.some(l => d.label.toLowerCase().includes(l)));
			} catch (error) {
				if (error instanceof DOMException && error.name === "NotAllowedError") {
					alert("Du har ikke givet adgang til at kameraet må bruges.");
				}
				return [];
			}
		}

		private async switchCamera(camDeviceIndex: number) {
			await this.stopCamera();

			this.currentCameraDeviceIndex = camDeviceIndex;
			this.saveCurrentCameraDeviceIndex();
			this.cameraRadioButtons.forEach((rb, idx) => rb.checked = idx == this.currentCameraDeviceIndex);
			await this.startCamera();
		}

		public switchToNextCamera() {
			this.switchCamera((this.currentCameraDeviceIndex! + 1) % this.cameraDevices!.length)
		}

		public switchToPreviousCamera(): void {
			this.switchCamera((this.currentCameraDeviceIndex! - 1 + this.cameraDevices!.length) % this.cameraDevices!.length);
		}

		public setUpChooseCameraGUI() {
			if (!this.cameraDevices || this.cameraDevices.length <= 1) {
				return;
			}

			registerCameraSwipeSwitcher(this);

			const videoContainer = this.video.parentElement;
			let camDevicesContainer = document.createElement("div");

			this.cameraRadioButtons = [];

			for (let index = 0; index < this.cameraDevices.length; index++) {
				const radio = document.createElement("input");
				const grpName = "camDeviceRBG";
				radio.type = "radio";
				radio.name = grpName;            // All radio buttons share the same group name
				radio.id = `${grpName}-${index}`;
				radio.checked = index == this.currentCameraDeviceIndex;
				radio.onclick = () => this.switchCamera(index);
				const labelText = "" + (index + 1);
				radio.value = labelText;

				const label = document.createElement("label");
				label.htmlFor = radio.id;
				label.textContent = labelText

				label.appendChild(radio);

				this.cameraRadioButtons.push(radio);
				camDevicesContainer.appendChild(label);
			}

			videoContainer?.appendChild(camDevicesContainer);
		}

		async startCamera() {
			try {
				if (this.currentCameraDeviceIndex == null || !this.cameraDevices || this.cameraDevices.length == 0) {
					return;
				}

				const ccd = this.cameraDevices[this.currentCameraDeviceIndex];

				if (this.debugShowCameraInfo) {
					let dbg = "";
					dbg += "currentDeviceIndex: " + this.currentCameraDeviceIndex + "\n";
					dbg += "deviceId: " + ccd.deviceId + "\n";
					dbg += "label: " + ccd.label + "\n";
					dbg += "kind: " + ccd.kind + "\n";
					dbg += "groupId: " + ccd.groupId + "\n";
					alert(dbg);
				}

				this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { ideal: ccd.deviceId } } })
				this.video.srcObject = this.mediaStream;

				await this.video.play();

				this.scanInterval = window.setInterval(() => this.tryScanQR(), 100);
				this.isCameraStarted = true;
			} catch (err) {
				console.error("Should have camera access here, but got error: ", err);
			}
		}

		async stopCamera() {
			if (this.mediaStream) {
				this.mediaStream.getTracks().forEach(track => track.stop());
				this.video.srcObject = null;
				clearInterval(this.scanInterval!);
				this.scanInterval = null;
				this.mediaStream = null;
			}

			this.isCameraStarted = false;
			// foelgende aht. firefox
			await new Promise(r => setTimeout(r, 500));
		}

		clearLastQrData() {
			this.lastQrData = null;
		}

		private tryScanQR(): void {
			if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
				return;
			}

			this.video.style.display = 'block';
			this.canvas.width = this.video.videoWidth;
			this.canvas.height = this.video.videoHeight;
			this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

			const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
			const code = jsQR(imageData.data, imageData.width, imageData.height);

			// send kode hvis vi ikke tidligere har scannet, det er en ny kode eller vi scanner den samme kode 2 sekunder eller senere
			if (code && (this.lastQrData == null || this.lastQrData.data != code.data || (Date.now() - this.lastQrData.datetime) > 2000)) {
				this.sendQRCodeToServer(code.data);
				this.lastQrData = { data: code.data, datetime: Date.now() };
			}
		}

		private sendQRCodeToServer(qrText: string): void {
			const eventArg = "QRDATA_" + qrText;
			window.__doPostBack(this.scanHandlerClientId, eventArg);
		}
	}

	function registerCameraSwipeSwitcher(scanner: QRScanner) {
		let startX = 0;
		const swipeThreshold = 50;

		scanner.video.addEventListener("touchstart", handleTouchStart, false);
		scanner.video.addEventListener("touchend", handleTouchEnd, false);

		function handleTouchStart(event: TouchEvent) {
			// Only track single-finger touches
			if (event.touches.length === 1) {
				startX = event.touches[0].clientX;
			}
		}

		function handleTouchEnd(event: TouchEvent) {
			if (event.changedTouches.length === 1) {
				const endX = event.changedTouches[0].clientX;
				const deltaX = endX - startX;

				if (Math.abs(deltaX) > swipeThreshold) {
					if (deltaX > 0) {
						// Swiped Right
						scanner.switchToPreviousCamera();
					} else {
						// Swiped Left
						scanner.switchToNextCamera();
					}
				}
			}
		}
	}
}