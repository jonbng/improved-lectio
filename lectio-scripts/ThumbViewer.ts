import { LectioJSUtils } from "./LectioJSUtils";
import { LectioDialog } from "./LectioDialog";

export namespace ThumbViewer {
	export function OnEditClick(url: string) {
		window.location.href = url;
	}

	//export function OnEditClick(event: any) {
	//	var lccId = $(event.srcElement).closest('[data-lectiocontextcard]').attr('data-lectiocontextcard');
	//	var imgId = $(event.srcElement).closest('[data-lectiocontextcard]').attr('imgid');
	//	LectioJSUtils.AssertNotNullOrEmpty(lccId, "lccId");
	//	LectioJSUtils.AssertNotNullOrEmpty(imgId, "imgId");

	//	$("div#thumbctrl_largeimg").remove();

	//	LectioDialog.ShowLectioPopupDialog("PhotoDialog.aspx?selectedEntityId=" + lccId, function (data) {
	//		var newPictureThumbUrl = data.newPictureThumbUrl;
	//		$('#' + imgId).attr('src', newPictureThumbUrl);

	//	}, "Rediger billede");
	//};

	export function Show(event: any, thumbid: string, FotoUploadUrl: string, showFotoUploadIcon: boolean) {

		let $div = $("div#thumbctrl_largeimg");
		if ($div.length == 0) {
			$div = $("<div id='thumbctrl_largeimg' title='Vis mindre foto' class='Photo'></div>");
			$div.click(function (e) { $(this).remove(); });
			$div.appendTo("body");
		}

		const evt = event || window.event;
		const img = $(evt.target || window!.event!.srcElement);
		const x = evt.clientX + (window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft);
		const y = evt.clientY + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);

		// empty the div
		$div.empty();
		$div.css('left', $(thumbid).offset()!.left);
		$div.css('top', $(thumbid).offset()!.top);
		$div.css('z-index', 10000);
		let imgurl = img.attr('src') as string;
		const imgurl2 = img.attr('src2');


		if (imgurl2 != null)
			imgurl = imgurl2;
		else if (imgurl.indexOf('defaultfoto') > -1 || imgurl.indexOf('portrait.gif') > -1)
			imgurl = '/lectio/img/defaultfoto_large.jpg';
		else {
			if (imgurl.match('&fullsize=3'))
				imgurl = imgurl.replace(/&fullsize=3/, "&fullsize=1");
			else if (imgurl.match('&fullsize=1')) {
				// ok
			}
			else
				imgurl = imgurl + '&fullsize=1';
		}

		//var lccId = img.attr('data-lectiocontextcard');
		//LectioJSUtils.AssertNotNullOrEmpty(lccId, "lccId");
		//$div.attr('data-lectiocontextcard', lccId as string);

		$div.attr('imgid', img.attr('id') as string);
		const editIconHtml_desktop = "<a title='Tag nyt billede fra en mobil enhed'  OnClick='alert(\"Du skal være på en mobil enhed for at bruge denne funktionalitet.\")' class='thumbViewerIcon OnlyDesktop'> <span class='ls-fonticon ls-fill-fonticon'>photo_camera</span></a>";
		const editIconHtml_mobile = "<a title='Tag nyt billede fra en mobil enhed'  OnClick='ThumbViewer.OnEditClick(\"" + FotoUploadUrl +"\")' class='thumbViewerIcon OnlyMobile'> <span class='ls-fonticon ls-fill-fonticon' >photo_camera</span></a>";
		$div.append("<span><img src='" + imgurl + "'>" + (showFotoUploadIcon ? editIconHtml_mobile + editIconHtml_desktop : "") + "</span>");

		//$div.append("<span><img src='" + imgurl + "'></span>");
		$div.show(100);
	}
}

