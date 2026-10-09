import { displayTooltip, type Plugin } from 'obsidian';
import { type CommentService, isCommentTarget } from '../comments/service';
import { cancelNativeHover, nativeHover, type NativeHover, officialTooltip, previewFile } from './file-tree-native-tooltip';

interface Hover {
	native: NativeHover;
	path: string;
	timer: number;
	ready: boolean;
	content: DocumentFragment | null;
	shown: boolean;
}

export function registerFileTreeTooltip(plugin: Plugin, service: CommentService): void {
	const document = plugin.app.workspace.containerEl.ownerDocument;
	const window = document.defaultView!;
	let current: Hover | null = null;
	let active = true;

	function tooltipContains(target: EventTarget | null): boolean {
		return target instanceof Node && Array.from(document.querySelectorAll('.tooltip.descript-ion-tooltip')).some(tooltip => tooltip.contains(target));
	}

	function clear(): void {
		if (current) {
			window.clearTimeout(current.timer);
			cancelNativeHover(current.native);
			current = null;
		}
		document.querySelectorAll('.tooltip.descript-ion-tooltip').forEach(tooltip => tooltip.remove());
	}

	function isCurrent(hover: Hover): boolean {
		return active && current === hover && hover.native.row.isConnected && hover.native.row.getAttribute('data-path') === hover.path;
	}

	function show(hover: Hover): void {
		if (!isCurrent(hover) || !hover.ready || !hover.content || hover.shown) return;
		hover.shown = true;
		// Both sections are ready. Native placement happens once for the final size.
		const options = {
			placement: hover.native.view.getSideTooltipPlacement(),
			horizontalParent: hover.native.view.containerEl,
			classes: ['descript-ion-tooltip'], delay: 0,
		};
		displayTooltip(hover.native.row, hover.content, options);
	}

	async function read(hover: Hover, event: PointerEvent): Promise<void> {
		const result = await service.open(hover.path);
		if (!isCurrent(hover)) return;
		if (result.status === 'ok' && !result.comment) {
			window.clearTimeout(hover.timer);
			hover.native.view.onFilePointerover(event, hover.native.row);
			return;
		}
		const fragment = document.createDocumentFragment();
		const comment = document.createElement('div');
		comment.className = result.status === 'ok' ? 'descript-ion-comment' : 'descript-ion-comment descript-ion-message';
		comment.textContent = result.status === 'ok' ? result.comment : result.message;
		const official = document.createElement('div');
		official.className = 'descript-ion-official';
		official.textContent = officialTooltip(hover.native);
		fragment.appendChild(comment);
		fragment.appendChild(official);
		hover.content = fragment;
		previewFile(plugin, hover.native, event);
		show(hover);
	}

	plugin.registerDomEvent(document, 'pointerover', event => {
		if (event.pointerType === 'touch' || tooltipContains(event.target)) return;
		const native = nativeHover(plugin, event.target);
		if (!native || !isCommentTarget(native.file.path)) return;
		if (event.relatedTarget instanceof Node && native.row.contains(event.relatedTarget)) return;
		if (current?.native.row === native.row && tooltipContains(event.relatedTarget)) {
			event.stopPropagation();
			return;
		}
		// Stop only this row's hover from reaching the native delegated handler.
		event.stopPropagation();
		clear();
		const hover: Hover = { native, path: native.file.path, timer: 0, ready: false, content: null, shown: false };
		current = hover;
		hover.timer = window.setTimeout(() => { hover.ready = true; show(hover); }, 200);
		void read(hover, event);
	}, true);
	plugin.registerDomEvent(document, 'pointerout', event => {
		if (!current) return;
		const next = event.relatedTarget;
		if (next instanceof Node && current.native.row.contains(next)) return;
		if (tooltipContains(next)) {
			event.stopPropagation();
			return;
		}
		clear();
	}, true);
	plugin.registerDomEvent(document, 'scroll', event => {
		if (!tooltipContains(event.target)) clear();
	}, true);
	plugin.registerDomEvent(document, 'pointerdown', event => {
		if (!tooltipContains(event.target)) clear();
	});
	plugin.registerDomEvent(document, 'keydown', clear);
	plugin.registerDomEvent(window, 'blur', clear);
	plugin.registerDomEvent(window, 'resize', clear);
	plugin.registerEvent(plugin.app.workspace.on('layout-change', clear));
	plugin.register(() => { active = false; clear(); });
}
