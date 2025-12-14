export namespace LectioQRCode {

	export function Initialize(imgId: string, imageSourceUrl: string | null, imageSourceData: string | null, timeoutAmount: number) {
		
		window.WakeLockManager.enable();

		if (imageSourceData && imageSourceUrl){
			throw new Error('imageSourceUrl && imageSourceData');
		}

		if (imageSourceUrl) {
			setQrSrc_url(imgId, imageSourceUrl);

				if (timeoutAmount > 0) {
					setInterval(() => {
						setQrSrc_url(imgId, imageSourceUrl);
					}, timeoutAmount);
			}
		}
		else if (imageSourceData) {
			setQrSrc_data(imgId, imageSourceData);
			// todo: refresh data her somehow?
		}
		else {
			throw new Error('imageSourceUrl==null && imageSourceUrl==null');
		}
	}

	// src er billede data direkte typisk base64 encoded billede
	function setQrSrc_data(qrImgClientId: string, qrSrcData: string ) {
		$('#' + qrImgClientId).attr('src', qrSrcData);
	}

	function setQrSrc_url(qrImgClientId: string, qrSrcUrl: string ) {
		// todo: maaske lad vaere med at opdatere src, hvis qr-koden ikke er synlig?
        $('#' + qrImgClientId).attr('src', qrSrcUrl + "&time=" + new Date().getTime());
    }

}