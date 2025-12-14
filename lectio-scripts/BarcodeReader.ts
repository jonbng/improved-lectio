import { JSErrorHandling } from "./JSErrorHandling";

interface BarcodeHistEntry {
	keyChar: string;
	milliSecondsSinceLast: number;
	timestamp: Date;
}
interface BarcodeReadData {
	barcode: string;
	timeTaken: number;
	getDiagnosticsData: () => { history: BarcodeHistEntry[] };
}

export class BarcodeReader {
	private keyEventHist: BarcodeHistEntry[] = [];
	private static barCodeEndChar = 'Enter';
	// Returns -1 if start was not found - NB! Tilstandsløs!
	private static searchForStartOfCharsFromScanner(keyEventHist: BarcodeHistEntry[]): number {
		const maxMsDiffChar = 160;
		const maxMsDiffAvg = 50;


		const endIndex = keyEventHist.length - 1;
		let accMilliSeconds = 0;
		let idx = endIndex;
		for (; idx >= 0; idx--) {

			const currDiff = keyEventHist[idx].milliSecondsSinceLast;
			if (isNaN(currDiff)) {
				break;
			}

			if (currDiff > maxMsDiffChar) { // Man kunne også sige currDiff > 4 * (accMilliSeconds / ((endIndex - idx) + 1))    -  Men bør så tage Max( denne værdi, 200)
				break;
			}

			accMilliSeconds += currDiff;
		}
		const avgMsPerChar = accMilliSeconds / ((endIndex - idx) + 1);
		if (avgMsPerChar > maxMsDiffAvg)
			return -1;

		return idx;
	}

	// Slet barCodeEndChar og gør den tilstandsløs?
	static logBarcodesNotRead(debugheadline: string, keyEventHist: BarcodeHistEntry[]): void {
		// Er det sandsynligt at keyEventHist indeholder en stregkode ~ er der mindst tre keyevents med kortere tid end 50ms?
		let fastKeyCnt = 0;

		for (let idx2 = 0; idx2 < keyEventHist.length; idx2++) {

			if (!isNaN(keyEventHist[idx2].milliSecondsSinceLast) && keyEventHist[idx2].milliSecondsSinceLast < 75) {
				fastKeyCnt++;
			}
		}

		if (fastKeyCnt < 3) {
			return; // Vi tror det var manuelle tastninger
		}

		// Log key events i Lectios fejlsiden
		let debugtext = debugheadline + "\nBufferdump - key - ms since last stroke\n";
		for (let idx = 0; idx < keyEventHist.length; idx++) {

			const currKeyEvent = keyEventHist[idx];
			debugtext += (currKeyEvent.keyChar !== BarcodeReader.barCodeEndChar ? currKeyEvent.keyChar : "[ENTER]") + ": " + currKeyEvent.milliSecondsSinceLast + "\n";

		}
		JSErrorHandling.reportJSError(debugtext);
	}

	public getDiagnosticsData(): BarcodeHistEntry[] {
		return this.keyEventHist.slice(0, this.keyEventHist.length);
	}

	processKeyPress(keyChar: string): BarcodeReadData | null {
		const ts = new Date();
		const entry: BarcodeHistEntry = {
			keyChar: keyChar,
			milliSecondsSinceLast: (this.keyEventHist.length > 0 ? ts.getTime() - this.keyEventHist[this.keyEventHist.length - 1].timestamp.getTime() : NaN),
			timestamp: ts
		};
		const data = this.processHistEntry(entry);
		return data;
	}

	public processHistEntry(entry: BarcodeHistEntry): BarcodeReadData | null {
		this.keyEventHist.push(entry);
		// Vi skal bare huske lidt keyhist tilbage i tid - skal kunne indeholde QR kode længde
		if (this.keyEventHist.length > 500) {
			this.keyEventHist = this.keyEventHist.slice(this.keyEventHist.length - 30);
		}

		const keyCode = entry.keyChar.charCodeAt(0);
		if (keyCode < 30
			&& keyCode != 9
			&& keyCode != 27
			&& entry.keyChar !== BarcodeReader.barCodeEndChar) {
			BarcodeReader.logBarcodesNotRead("BC:ControlChar STM16801", this.keyEventHist);
		}

		// Vi fortsætter først når vi får et END tegn
		if (entry.keyChar !== BarcodeReader.barCodeEndChar) {
			return null;
		}

		const histCopy = this.keyEventHist;
		this.keyEventHist = [];

		if (histCopy.length < 6) {
			BarcodeReader.logBarcodesNotRead("BC:histCopy.length < 6", histCopy);
			return null;
		}

		const endIndex = histCopy.length - 2;
		const firstValidIndex = BarcodeReader.searchForStartOfCharsFromScanner(histCopy);

		if (firstValidIndex === -1) {
			BarcodeReader.logBarcodesNotRead("BC:firstValidIndex === -1", histCopy);
			return null;
		}
		const charCount = (endIndex - firstValidIndex) + 1;
		if (charCount >= 5) {
			const stregkodeEventSlice = histCopy.slice(firstValidIndex, firstValidIndex + charCount);
			let barcode = "";
			const timeTaken = stregkodeEventSlice[stregkodeEventSlice.length - 1].timestamp.getTime() - stregkodeEventSlice[0].timestamp.getTime();
			for (let i = 0; i < stregkodeEventSlice.length; i++) {
				barcode += stregkodeEventSlice[i].keyChar;
			}

			return {
				barcode: barcode,
				timeTaken: timeTaken,
				getDiagnosticsData: () => {
					return {
						history: histCopy
					};
				}
			};
		}
		BarcodeReader.logBarcodesNotRead("BC:endIndex - firstValidIndex + 1 < 5", histCopy);

		return null;
	}

	public static Instance: BarcodeReader;
	// Til test.
	public static PretendBarcodeRead(barcode: string) {
		this.handlerx({
			barcode: barcode, timeTaken: 50, getDiagnosticsData: () => {
				return {
					history:

						[{
							keyChar: 'A',
							keyCode: 65,
							milliSecondsSinceLast: 10,
							timestamp: new Date(),
						}]
				};
			}
		})

	}
	static handlerx: (data: BarcodeReadData) => void;

	public static InitializeInstance(handler: (data: BarcodeReadData) => void) {
		if (BarcodeReader.Instance)
			throw new Error('Barcodereader er allerede initialiseret.');

		BarcodeReader.handlerx = handler;
		const reader = new BarcodeReader();

		$(document).on('keydown', 
			e => {
				// Check if this looks like scanner input (printable character or Enter)
				if (e.key.length === 1 || e.key === 'Enter') {	
					const data = reader.processKeyPress(e.key);
					if (data) {
						handler(data);
					}
					
					const activeElement = document.activeElement;
					const isInputField = activeElement && (
						activeElement.tagName === 'INPUT' || 
						activeElement.tagName === 'TEXTAREA' || 
						activeElement.tagName === 'SELECT'
					);

					if (!isInputField) {
						// den her forhindrer firefox i at lave "find in page".
						return false;
					}
				}

				return;
			});

		// KeyboardNavEnterSuppressed: Orientering fra KeyboardNav om at den har slugt et enter-tryk.
		$(document).on('FormDefaultButtonActivated KeyboardNavEnterSuppressed',
			e => {
				const data = reader.processKeyPress('Enter');
				if (data) {
					e.preventDefault();
					handler(data);
				}
				return !data;
			});

		$(document).on('barCodeRead', e => {
			if (e.data == null)
				return;

			handler(<BarcodeReadData>(<any>e.data));
		});

		BarcodeReader.Instance = reader;
	}

	public static drawEan13(canvas: HTMLCanvasElement, barCodeAsBitString: string) {
		const ctx = canvas.getContext("2d");
		if (ctx == undefined)
			throw new Error('canvas');
		const widthPerLine = canvas.width / barCodeAsBitString.length;

		ctx.fillStyle = "rgba(0, 0, 0, 1)";
		ctx.lineWidth = widthPerLine;

		for (let i = 0; i < barCodeAsBitString.length; i++) {
			if (barCodeAsBitString[i] === "1") {
				ctx.beginPath();
				ctx.moveTo(i * widthPerLine, 0);
				ctx.lineTo(i * widthPerLine, canvas.height);
				ctx.stroke();
			}
		}
	}
}
