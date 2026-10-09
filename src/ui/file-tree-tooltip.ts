import { type Plugin } from 'obsidian';
import { type CommentService, isCommentTarget } from '../comments/service';

// File explorer rows have no public hover API. Keep private DOM selectors here.
function commentRow(target: EventTarget | null): HTMLElement | null {
	if (!(target instanceof Element)) return null;
	const row = target.closest<HTMLElement>('.nav-file-title[data-path], .nav-folder-title[data-path]');
	return row?.closest('.workspace-leaf-content[data-type="file-explorer"]') ? row : null;
}

export function registerFileTreeTooltip(plugin: Plugin, service: CommentService): void {
	const document = plugin.app.workspace.containerEl.ownerDocument;
	const window = document.defaultView!;
	let current: HTMLElement | null = null;
	let tooltip: HTMLElement | null = null;
	let request = 0;
	let active = true;
	let hideTimer: number | undefined;

	function cancelHide(): void {
		window.clearTimeout(hideTimer);
		hideTimer = undefined;
	}

	function clear(): void {
		cancelHide();
		request++;
		current = null;
		tooltip?.remove();
		tooltip = null;
	}

	async function show(row: HTMLElement): Promise<void> {
		clear();
		const path = row.getAttribute('data-path');
		if (!path || !isCommentTarget(path)) return;
		current = row;
		const pending = request;
		const result = await service.open(path);
		if (!active || pending !== request || !row.isConnected || row.getAttribute('data-path') !== path) return;
		const text = result.status === 'ok' ? result.comment : result.message;
		if (!text) return;
		tooltip = document.body.createDiv({ cls: 'descript-ion-tooltip', text });
		tooltip.setAttribute('role', 'tooltip');
		if (result.status !== 'ok') tooltip.addClass('descript-ion-message');
		const bounds = row.getBoundingClientRect();
		const below = Math.max(0, window.innerHeight - 8 - bounds.bottom);
		const above = Math.max(0, bounds.top - 8);
		const placeBelow = tooltip.offsetHeight <= below;
		const available = placeBelow ? below : above;
		tooltip.setCssProps({ '--descript-ion-max-height': `${Math.min(160, available)}px` });
		const left = Math.max(8, Math.min(bounds.left, window.innerWidth - tooltip.offsetWidth - 8));
		const top = placeBelow ? bounds.bottom : Math.max(8, bounds.top - tooltip.offsetHeight);
		tooltip.setCssProps({ '--descript-ion-left': `${left}px`, '--descript-ion-top': `${top}px` });
	}

	plugin.registerDomEvent(document, 'mouseover', event => {
		if (event.target instanceof Node && tooltip?.contains(event.target)) {
			cancelHide();
			return;
		}
		const row = commentRow(event.target);
		if (!row) return;
		if (row !== current) void show(row);
		else cancelHide();
	});
	plugin.registerDomEvent(document, 'mouseout', event => {
		const next = event.relatedTarget;
		if (next instanceof Node && (current?.contains(next) || tooltip?.contains(next))) {
			cancelHide();
			return;
		}
		if (commentRow(next)) {
			clear();
			return;
		}
		if (event.target instanceof Node && (current?.contains(event.target) || tooltip?.contains(event.target))) {
			cancelHide();
			hideTimer = window.setTimeout(clear, 150);
		}
	});
	plugin.registerDomEvent(document, 'scroll', event => {
		if (event.target instanceof Node && tooltip?.contains(event.target)) return;
		clear();
	}, true);
	plugin.registerDomEvent(document, 'mousedown', event => {
		if (event.target instanceof Node && tooltip?.contains(event.target)) return;
		clear();
	});
	plugin.registerDomEvent(document, 'keydown', clear);
	plugin.registerDomEvent(window, 'blur', clear);
	plugin.registerDomEvent(window, 'resize', clear);
	plugin.registerEvent(plugin.app.workspace.on('layout-change', clear));
	plugin.register(() => {
		active = false;
		clear();
	});
}
