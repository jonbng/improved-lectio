import { LectioJSUtils } from "./LectioJSUtils";

export namespace LectioTreeView {

	function GetExpandedNodeIds(containerId: string): string[] {
		const container = document.getElementById(containerId);
		if (!container)
			throw new Error('container');
		const expandedNodeIds = $(container).find('div[lec-role=ltv-sublist]').
			filter((_, el: HTMLElement) => el.style.display !== 'none').
			parent().toArray().
			map(el => el.getAttribute('lec-node-id') || '');

		return expandedNodeIds;
	}

	type LectioTreeViewOptions = {
		containerId: string,
		doPostback: (commandArgument: string) => void,
		expandedNodesHiddenId: string,
	};

	const initializedids: { [key: string]: boolean } = {};

	export function ReInitialize(options: LectioTreeViewOptions) {
		if (initializedids[options.containerId])
			delete initializedids[options.containerId];

		Initialize(options);
	}

	export function Initialize(options: LectioTreeViewOptions) {
		LectioJSUtils.AssertNotNullOrUndefined(options, 'options');
		LectioJSUtils.AssertNotNullOrEmpty(options.containerId, 'containerId');
		LectioJSUtils.AssertNotNullOrEmpty(options.expandedNodesHiddenId, 'expandedNodesHiddenId');
		LectioJSUtils.AssertNotNullOrUndefined(options.doPostback, 'doPostback');

		const selectedNodeClass = 'selectedFolder';

		const container = document.getElementById(options.containerId);
		if (!container)
			throw new Error('container');

		if (initializedids[options.containerId])
			return;

		initializedids[options.containerId] = true;

		$(container).on('click',
			'a',
			evt => {
				evt.preventDefault();
				const cmd = evt.currentTarget.getAttribute('lec-command');
				if (!cmd)
					throw new Error('ltv click uden target.');

				const entireNode = $(evt.currentTarget).parents('div[lec-role=treeviewnodecontainer]:first');
				LectioJSUtils.AssertOneElement(entireNode);
				switch (cmd) {
					case 'ltv-selectnode':
						{
							const nodeId = <string>entireNode.attr('lec-node-id');
							LectioJSUtils.AssertNotNullOrEmpty(nodeId, 'nodeId');

							$(container).find('.' + selectedNodeClass).removeClass(selectedNodeClass);
							$(evt.currentTarget).addClass(selectedNodeClass);
							options.doPostback(nodeId);

							break;
						}
					case 'ltv-togglesublist':
						{
							const sublist = entireNode.children('div[lec-role=ltv-sublist]');
							LectioJSUtils.AssertOneElement(sublist);
							const img = entireNode.children('div:first').find('[lec-command=ltv-togglesublist]').find('img');
							LectioJSUtils.AssertOneElement(img);

							const src = <string>img.attr('src');
							const other = <string>img.attr('lec-other-src');
							sublist.toggle();
							img.attr('src', other);
							img.attr('lec-other-src', src);

							const hf = document.getElementById(options.expandedNodesHiddenId);
							if (!hf || !(hf instanceof HTMLInputElement))
								throw new Error('hf');
							hf.value = GetExpandedNodeIds(options.containerId).join(' ');
							break;
						}
					default:
						throw new Error('ltv command ' + cmd);
				}
			});
	}

	type rel<T1, T2> = { v1: T1, v2: T2, query: string };
	const mkrel = function <T1, T2>(query: string): rel<T1, T2> {
		return { v1: 123 as any, v2: 33 as any, query };
	}

	function relationQuerySelector<TRel extends keyof typeof myrels>(
		v1: typeof myrels[TRel]['v1'],
		rel: TRel,
	): typeof myrels[TRel]['v2'] | null {
		return v1.querySelector<typeof myrels[TRel]['v2']>(myrels[rel].query);
	}

	function relationQuerySelectorAll<TRel extends keyof typeof myrels>(
		v1: typeof myrels[TRel]['v1'],
		rel: TRel,
	): NodeListOf<typeof myrels[TRel]['v2']> {
		return v1.querySelectorAll<typeof myrels[TRel]['v2']>(myrels[rel].query);
	}

	// html-strukturen er (202206) som foelger:
	// div[lec-role=treeviewnodecontainer][lec-node-id=xxxx]
	//   div.TreeNode-container
	//     a[lec-command=ltv-togglesublist]
	//     a[lec-command=ltv-selectnode] <-- mappenavn
	//   div[lec-role=ltv-sublist] <-- toggles via sin "display"
	//     (undermapper:)
	//     div[lec-role=treeviewnodecontainer][lec-node-id=xxxx]
	//       div.TreeNode-container (som ovenfor)
	//     [gentagelse af ^^]

	type EContainerList = HTMLElementX<'EContainerList'>;
	type EContainer = HTMLElementX<'EContainer'>;
	type EName = HTMLElementX<'EName'>;
	type EToggle = HTMLElementX<'EToggle'>;

	const myrels = {
		'foldercontainer': mkrel<EContainerList, EContainer>(':scope > [lec-role=treeviewnodecontainer]'),
		'foldername': mkrel<EContainer, EName>(':scope > div > [lec-command=ltv-selectnode]'),
		'subfolders': mkrel<EContainer, EContainerList>(':scope > [lec-role=ltv-sublist]'),
		'togglesublist': mkrel<EContainer, EToggle>(':scope > div > [lec-command=ltv-togglesublist]'),
	}

	const findOrThrow = (folder: EContainerList, name: string): EContainer => {
		const withnames = relationQuerySelectorAll(folder, 'foldercontainer')
			.map(folderele => ({
				name: relationQuerySelector(folderele, 'foldername')!.innerText,
				folderele: folderele
			}));
		const thefolder = withnames
			.singleOrDefault(r => r.name === name) ?? LectioJSUtils.Throw(`Fandt ikke folder '${name}'.`);
		return thefolder.folderele;
	}

	function expandIntoView(path: readonly string[]) {
		LectioJSUtils.AssertArgument(path.length >= 1);

		let curr = document.querySelectorAll<EContainerList>('.lectio_treeview').singleOrDefault()
			?? LectioJSUtils.Throw('trae ikke fundet');

		for (const name of path) {
			const thisfolder = findOrThrow(curr, name);
			thisfolder.scrollIntoView();

			const subfoldercontainer = relationQuerySelector(thisfolder, 'subfolders')
				?? LectioJSUtils.Throw(`Folderen '${name}' har vist ikke underfoldere.`);
			const subfoldersAreExpanded = $(subfoldercontainer).is(':visible');
			if (!subfoldersAreExpanded) {
				const button = relationQuerySelector(thisfolder, 'togglesublist')
					?? LectioJSUtils.Throw('fandt ikke toggle');
				$(button).click();
				LectioJSUtils.AssertArgument($(subfoldercontainer).is(':visible'));
			}

			curr = subfoldercontainer;
		}

		return curr;
	}

	export function GetSubfolderNames_unittest(path: readonly string[]): string[] {
		const folder = expandIntoView(path);

		return relationQuerySelectorAll(folder, 'foldercontainer')
			.map(folderele =>
				relationQuerySelector(folderele, 'foldername')!.innerText
			);
	}

	export function EnterFolder_unittest(path: readonly string[]): void {
		const folder = expandIntoView(path.slice(0, -1));

		{
			const name = path[path.length - 1];
			const thisfolder = findOrThrow(folder, name);
			const ename = relationQuerySelector(thisfolder, 'foldername')
				?? LectioJSUtils.Throw(`fandt ikke mappe '${name}'.`);
			$(ename).click();
		}
	}
}
