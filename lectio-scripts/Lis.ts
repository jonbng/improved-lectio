import { LectioJSUtils } from "./LectioJSUtils";

function LisDbgSnapshot(ms: MediaStream, dbg: boolean) {
	const video = document.getElementById("video") as HTMLVideoElement;
	const vts = ms.getVideoTracks();
	const caps = vts[0].getSettings()
	const width = caps.width!;
	const height = caps.height!;

	const canvas = document.createElement("canvas") as HTMLCanvasElement;
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context)
		throw new Error("kunne ikke faa 2d context");

	let res2: { (arg0: null): void; (value?: unknown): void; }, rej2;
	const p = new Promise(res1 => { res2 = res1 });
	context.drawImage(video, 0, 0, width, height);
	const frame = canvas.toDataURL("image/png");
	canvas.toBlob(blob => {
		if (dbg) {
			LectioJSUtils.LogDebug(`fit bitmap: ${frame.length}`);
			LectioJSUtils.LogDebug(`fit bitmap: ${blob ? 1 : 0}`);

			const img = document.getElementById('lis_img') as HTMLImageElement;
			img.src = frame;
		}

		if (!blob)
			throw new Error('fik ikke blob');

		const formData = new FormData();
		formData.append("fil1", blob, "still.png");

		fetch('lispopup.api', {
			method: "POST",
			body: formData
		}).then(response => {
			res2(null);
		})

	}, 'image/jpeg');

	return p;
}

export function LisStartScreenSharing(dbg: boolean) {
	navigator.mediaDevices.getDisplayMedia({ video: true })
		.then((stream: MediaStream): void => {
			const video = document.getElementById("video") as HTMLVideoElement;

			video.srcObject = stream;

			alert('Smukt. Du deler nu. Lectio support kan se det delte indhold indtil dette vindue lukkes.');
			setTimeout(() => {
				function schednext() {
					setTimeout(() => {
						LisDbgSnapshot(stream, dbg)
							.then(() => { schednext(); });
					}, 1000);

				}
				LisDbgSnapshot(stream, dbg);
				schednext();
			}, 100);
		}, () => alert('error')).catch(() => alert('error2'));
}
