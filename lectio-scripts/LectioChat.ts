import { LectioJSUtils } from "./LectioJSUtils";


import * as Combokeys from "combokeys";

export namespace LectioChat {
    export function Init(): void {
        const useWebSockets = true;
        if (useWebSockets) {
            LectioJSUtils.PostCurrentPageApi('PrepareWebsocket', {}).then(() => {
                const ws = new WebSocket('wss://wpc-rasmus.macom.dk/lectio/941/test/chat.api/StartMessageLoop');
                ws.onmessage = msg => LectioJSUtils.LogDebug('got msg', msg);
                ws.onopen = args => LectioJSUtils.LogDebug('ws open', args);
                ws.onerror = args => LectioJSUtils.LogDebug('ws err', args);

                (window as any).chatsocket = ws;
            });
            return;
        }
        const hub = $.connection.hub.createHubProxy("chatHub");
        (window as any).chathub = hub;

        const hubx = hub as any as { server: { postMessage: (msg: string) => void; } };

        const list = LectioJSUtils.GetNotNullValue(document.querySelector('.ls-chat-msglist'), 'msglist');
        // todo se om vi kan lytte kun indenfor "list"...
        // let ck = new Combokeys(document.documentElement);

        const ta = LectioJSUtils.GetNotNullValue(document.getElementById('msgTA'), 'ta') as HTMLTextAreaElement;
        ta.addEventListener('keypress', evt => {
            const rv: boolean = (() => {
                const isSendItShortcut = evt.charCode === 13 && !evt.ctrlKey && !evt.altKey && !evt.shiftKey && !evt.metaKey;
                if (!isSendItShortcut)
                    return false;
                const msg = ta.value;
                ta.value = '';
                if (!msg.trim())
                    return false;
                hubx.server.postMessage(msg);
                return true;
            })();
            if (rv) {
                evt.preventDefault();
                evt.cancelBubble = true;
            }
        });

        hub.on("MessagePosted", (e: { message: string, html: string }) => {
            LectioJSUtils.LogDebug('msg', e);
            const ele = document.createElement('div');
            ele.innerHTML = e.html;
            list.appendChild(ele);
        });
        $.connection.hub.start()
    }
}
