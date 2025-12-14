import { LectioJSUtils } from "./LectioJSUtils";

let isInitialized: boolean;

export function InitLectioCheckBox() {
    if (isInitialized)
        return;
    isInitialized = true;

    $(document).on('click', 'img[data-role=cb]', event => {
        event.stopPropagation();
        const img = LectioJSUtils.GetAssertedType(event.target, HTMLImageElement, "img");
        ToggleCheckBox(img);
    });;
    $(document).on('keypress', 'img[data-role=cb]', event => {
        if (!(event.key === ' '))
            return;
        event.stopPropagation();
        // vil ikke have at siden scroller.
        event.preventDefault();
        const img = LectioJSUtils.GetAssertedType(event.target, HTMLImageElement, "img");
        ToggleCheckBox(img);
    });;
}

function ToggleCheckBox(imgele: HTMLImageElement) {
    const img = $(imgele);
    const hid = img.next();

    const isChecked = !(hid.val() == "1");
    const src = img.attr('src');
    const newsrc = src!.replace(/_(checked|unchecked)/, m => '_' + (m === '_checked' ? 'unchecked' : 'checked'))
    if (newsrc === src)
        throw new Error('lectiocheckbox img src genkendes ikke: ' + src);

    img.attr('src', newsrc);
    hid.val(isChecked ? "1" : "0");
}
