import { EventMods, LectioJSUtils, Writeable } from "./LectioJSUtils";
import { SkemaForsideUtils } from "./SkemaForsideUtils";

export namespace SkemaListe {

	let containerID: string;

	export function Initialize(containerId: string, skemaListeIdSkemaForside = ""): void {
		containerID = containerId;
		const contentDiv = document.getElementById(containerId);
		if (!contentDiv)
			return;
		if (LectioJSUtils.HasBeenHere(contentDiv, 'skemaliste'))
			return;

		SkemaForsideUtils.SetupBrikIndividualSelection(contentDiv, skemaListeIdSkemaForside, containerID);
	}
}