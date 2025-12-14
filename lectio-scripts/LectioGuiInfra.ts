

type Reg = {
    close: () => void;
    getControlRootElements: () => HTMLElement[];
}

let registeredModalStuff: Reg | undefined;
let hasRegisteredEventListeners: true | undefined;

export namespace LectioGuiInfra {
    export function IWillShowModalStuff(closeCallback: Reg): void {
        if (!hasRegisteredEventListeners) {
            // eval('debugger')
            document.body.addEventListener('click', e => {
                // console.log('infra: click', e.target);
                const target = e.target;
                if (!(target instanceof HTMLElement))
                    return;

                const obj = registeredModalStuff;
                const roots = obj?.getControlRootElements() ?? [];
                const comesFromWithinIt = !!roots.firstOrDefault(root => root === target || (root.compareDocumentPosition(target) & document.DOCUMENT_POSITION_CONTAINED_BY) !== 0);
                // console.log('focusin x', comesFromWithinIt);
                if (!comesFromWithinIt)
                    obj?.close();
            });
            document.body.addEventListener('focusin', e => {
                // console.log('infra: focusin', e.target);
                const target = e.target;
                if (!(target instanceof HTMLElement))
                    return;

                const obj = registeredModalStuff;
                const roots = registeredModalStuff?.getControlRootElements() ?? [];
                const comesFromWithinIt = !!roots.firstOrDefault(root => root === target || (root.compareDocumentPosition(target) & document.DOCUMENT_POSITION_CONTAINED_BY) !== 0);
                // console.log('focusin x', comesFromWithinIt);
                if (!comesFromWithinIt)
                    obj?.close();
            });

            hasRegisteredEventListeners = true;
        }

        registeredModalStuff?.close();
        registeredModalStuff = closeCallback;
    }
}
