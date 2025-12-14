import { LectioGuiInfra } from "./LectioGuiInfra";
import { LectioJSUtils } from "./LectioJSUtils";

const classClosed = 'prepend-fonticon-arrow-right';
const classOpen = 'prepend-fonticon-arrow-down';

let eventAbort: AbortController | undefined;

export namespace ReportDesigner2 {

    export function ReportDesign2Init(filterdiv: HTMLElement, cmdBtnId: string, cmdinp: HTMLInputElement) {
        LectioJSUtils.AssertType(filterdiv, HTMLElement);
        LectioJSUtils.AssertType(cmdinp, HTMLInputElement);
        const gv = filterdiv.querySelector('.lf-grid');
        LectioJSUtils.AssertType(gv, HTMLElement);

        eventAbort?.abort();
        const ea = eventAbort = new AbortController();


        gv.addEventListener('focusin', onFilterInputFocusIn, { signal: eventAbort.signal });

        $(() => {
            const fl = document.querySelector('.ls-report-field-list');
            if (!fl)
                return;
            fl.addEventListener('click',
                e => {
                    const ele = e.target;
                    if (!(ele instanceof HTMLElement && ele.matches('.ls-report-field-list-group-heading')))
                        return;

                    if (ele.matches('.' + classClosed)) {
                        ele.classList.remove(classClosed);
                        ele.classList.add(classOpen);
                    } else {
                        ele.classList.add(classClosed);
                        ele.classList.remove(classOpen);
                    }
                }, { signal: ea.signal });
        });

        document.body.addEventListener('click',
            e => {
                const ele = e.target;
                if (!(ele instanceof HTMLElement && ele.matches('.ls-report-fields-island .islandHeader')))
                    return;

                ToggleAllFieldGroups();
            }, { signal: ea.signal });

        type FieldDragData = Readonly<{
            List: string;
            Index: number;
        }>;

        let adornedTr: HTMLTableRowElement | undefined;
        let adornedTrAfter: boolean | undefined;

        const rep = document.querySelector('.ls-report-setup')!;
        LectioJSUtils.AssertType(rep, HTMLElement);

        rep.addEventListener('dragstart', evt => {
            const ele = evt.target;
            LectioJSUtils.AssertType(ele, HTMLElement);

            const data = GetFieldDragData(ele);
            LectioJSUtils.AssertNotNullOrUndefined(data, 'data');

            const dt = evt.dataTransfer;
            LectioJSUtils.AssertNotNullOrUndefined(dt, 'dt');
            dt.setData('text/lec-xpdata', JSON.stringify(data));
            dt.effectAllowed = 'copyMove';

        }, { signal: eventAbort.signal });

        rep.addEventListener('dragover', evt => {
            LectioJSUtils.AssertNotNullOrUndefined(evt.dataTransfer, 'dt');
            const ele = evt.target;
            LectioJSUtils.AssertType(ele, HTMLElement);

            const destData = GetFieldDropData(ele, evt);
            if (!destData) {
                RemoveDragOverAdorner();
                return;
            }

            evt.preventDefault(); // accepter drag over.
            evt.dataTransfer.dropEffect = LectioJSUtils.ComputeDropEffect(evt);

            // Lidt perf.
            const unchanged = adornedTr && adornedTrAfter === destData.InsertAfter;
            if (unchanged)
                return;

            RemoveDragOverAdorner();
            adornedTr = destData.TR;
            adornedTrAfter = destData.InsertAfter;
            adornedTr.classList.add(destData.InsertAfter ? 'ls-insert-adorner-after' : 'ls-insert-adorner-before');

        }, { signal: eventAbort.signal });

        rep.addEventListener('dragend', evt => {
            RemoveDragOverAdorner();
        }, { signal: eventAbort.signal });

        rep.addEventListener('drop', evt => {
            evt.preventDefault();
            const ele = evt.target;
            LectioJSUtils.AssertType(ele, HTMLElement);

            const destData = GetFieldDropData(ele, evt);
            if (!destData) {
                RemoveDragOverAdorner();
                return;
            }

            LectioJSUtils.AssertNotNullOrUndefined(evt.dataTransfer, 'dt');

            const json = evt.dataTransfer.getData('text/lec-xpdata');
            LectioJSUtils.AssertNotNullOrEmpty(json, 'json');
            const dropData: FieldDragData = JSON.parse(json);

            LectioJSUtils.AssertNotNullOrEmpty(dropData.List, 'List');
            console.log('drop', evt.dataTransfer?.dropEffect);
            cmdinp.value = [dropData.List, dropData.Index, destData.DD.List, destData.DD.Index, evt.dataTransfer.dropEffect].join(',');
            window.__doPostBack(cmdBtnId, 'fq_DragDrop:x');

        }, { signal: eventAbort.signal });

        function RemoveDragOverAdorner(): void {
            if (!adornedTr)
                return;
            adornedTr.classList.remove('ls-insert-adorner-before', 'ls-insert-adorner-after')
            adornedTr = undefined;
        }

        function GetFieldDragData(ele: HTMLElement): FieldDragData | null {
            if (!ele.matches('.ls-report-setup table.lf-grid[data-xplist-id] > tbody > tr *'))
                return null;

            const tr = ele.closest('table.lf-grid[data-xplist-id] > tbody > tr');
            LectioJSUtils.AssertType(tr, HTMLTableRowElement);

            const xplistid = ele.closest('table.lf-grid[data-xplist-id]')?.getAttribute('data-xplist-id');
            LectioJSUtils.AssertNotNullOrEmpty(xplistid, 'xplistid');

            return {
                Index: tr.rowIndex,
                List: xplistid,
            };
        }

        function GetFieldDropData(ele: HTMLElement, evt: DragEvent): {
            DD: FieldDragData,
            TR: HTMLTableRowElement,
            InsertAfter: boolean
        } | null {
            if (!ele.matches('.ls-report-setup table.lf-grid[data-xplist-id] > tbody > tr *'))
                return null;

            const tr = ele.closest('table.lf-grid[data-xplist-id] > tbody > tr');
            LectioJSUtils.AssertType(tr, HTMLTableRowElement);

            const cbtr = tr.getBoundingClientRect();
            const isLowerHalf = evt.clientY > cbtr.top + cbtr.height / 2;
            const insertAfter = isLowerHalf && !tr.querySelector(':scope > td > div.noRecord');

            const xplistid = ele.closest('table.lf-grid[data-xplist-id]')?.getAttribute('data-xplist-id');
            LectioJSUtils.AssertNotNullOrEmpty(xplistid, 'xplistid');

            const destData: FieldDragData = {
                Index: tr.rowIndex + (insertAfter ? 1 : 0),
                List: xplistid,
            };
            return { DD: destData, TR: tr, InsertAfter: insertAfter };
        }
    }
}

function ToggleAllFieldGroups() {
    const fl = document
        .querySelector('.ls-report-field-list');
    LectioJSUtils.AssertNotNullOrUndefined(fl, 'fl');

    const headings = fl
        .querySelectorAll('.ls-report-field-list-group-heading');
    const allOpen = headings.filter(h => h.matches('.' + classOpen)).length === headings.length;
    const [classToRemove, classToAdd] = allOpen ? [classOpen, classClosed] : [classClosed, classOpen];

    for (const ele of headings) {
        ele.classList.remove(classToRemove);
        ele.classList.add(classToAdd);
    }
}

const enc = (str: string): string => str.replace('<', '&lt;');

function onFilterInputFocusIn(e: FocusEvent): void {
    const inp = e.target;
    if (!(inp instanceof HTMLInputElement && inp.type === 'text'))
        return;
    const commentEle = inp.parentElement!.nextSibling!.nextSibling;
    if (!commentEle)
        return;
    const jsonValues = commentEle.textContent;
    const candidateValues = JSON.parse(jsonValues ?? '');
    LectioJSUtils.AssertType(candidateValues, Array);


    const currValsRaw = (inp.value ?? '').split(/\s*;\s*/);
    const currVals = currValsRaw.length === 1 && currValsRaw[0] === '' ? [] : currValsRaw;

    {
        const opdd = inp.closest('tr')!.querySelectorAll('select').single();
        const oldop = opdd.value;

        if (candidateValues.length === 0) {
            const anyway = (oldop === 'inset' || oldop === 'notinset') && currVals.length > 0;
            if (!anyway)
                return;
        }
    }
    e.stopPropagation();

    const valuesAsKeys = new Set<string>(candidateValues.map(v => {
        if (typeof (v) !== 'string')
            throw new Error();
        return v;
    }));

    const addVals: string[] = [''];
    for (const v of currVals) {
        if (!v)
            continue;
        if (!valuesAsKeys.has(v))
            addVals.push(v);
    }

    const candidateValues2 = candidateValues as readonly string[];
    const valsToShow: string[] = [...addVals, ...candidateValues2];
    const idprefix = 'dd' + Math.round(Math.random() * 10000);
    let idx = -1;
    const trs = valsToShow
        .map(val => {
            idx++;
            const sel = currVals.indexOf(val) >= 0 ? ' checked' : '';
            return `<tr>
                    <td><input type=checkbox value='${val.replace("'", '&#39;')}' id='${idprefix + idx}' ${sel}></td>
                    <td><label for='${idprefix + idx}'>${val ? enc(val) : '(tom)'}</label></td>
                </tr>
                `;
        })
        .join('');

    const container = document.createElement('div');
    container.className = 'ls-field-value-chooser';

    const buttonhtml = `
        <div style='display: flex; flex-direction: row-reverse'>
            <div class="buttonoutlined">
                <a href="#" data-role="button" data-rolevariant=cancel>Annuller</a>
            </div>
            <div class="buttonoutlined">
                <a href="#" data-role="button" data-rolevariant=ok>Ok</a>
            </div>
        </div>
        `;

    container.innerHTML = buttonhtml + '<div style="overflow: auto; overscroll-behavior: contain; height: 100%;"><table>' + trs + '</table></div>';
    container.addEventListener('click', e => {
        LectioJSUtils.AssertType(e.target, HTMLElement);
        if (e.target.getAttribute('data-role') !== 'button')
            return;
        const variant = e.target.getAttribute('data-rolevariant');
        switch (variant) {
        case 'cancel':
            container.remove();
            break;
        case 'ok': {
            const cbs = container.querySelectorAll('input');
            const newVals: string[] = [];
            for (const cb of cbs) {
                if (cb.checked)
                    newVals.push(cb.value);
            }

            const opdd = inp.closest('tr')!.querySelectorAll('select').single();
            const multi = newVals.length > 1;
            const oldop = opdd.value;
            let newop;
            if (oldop === 'eq' || oldop === 'inset')
                newop = multi ? 'inset' : 'eq';
            else if (oldop === 'ne' || oldop === 'notinset')
                newop = multi ? 'notinset' : 'ne';
            else
                newop = null;

            if (newop !== null && newop !== oldop)
                opdd.value = newop;

            container.remove();
            inp.value = newVals.join(';');
            inp.dispatchEvent(new Event('change'));
            break;
        }
        default:
            throw new Error('huh?');
        }
    });

    LectioGuiInfra.IWillShowModalStuff({
        close: () => {
            container.remove();
        },
        getControlRootElements: () => {
            return [container, inp];
        },
    });

    document.querySelector('#ls-reporting')!.appendChild(container);
    $(container).position({ my: "left top", at: "left bottom", of: inp });
}
