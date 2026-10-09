import { type Plugin } from 'obsidian';
import { type CommentService, isCommentTarget } from '../comments/service';

// File explorer rows have no public hover API. Keep private DOM selectors here.
function commentRow(target: EventTarget | null): HTMLElement | null {
	if (!(target instanceof HTMLElement)) return null;
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

	function clear(): void {
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
		const left = Math.max(8, Math.min(bounds.right - 4, window.innerWidth - tooltip.offsetWidth - 8));
		const top = Math.max(8, Math.min(bounds.top, window.innerHeight - tooltip.offsetHeight - 8));
		tooltip.setCssProps({ '--descript-ion-left': `${left}px`, '--descript-ion-top': `${top}px` });
	}

	plugin.registerDomEvent(document, 'mouseover', event => {
		if (event.target instanceof Node && tooltip?.contains(event.target)) return;
		const row = commentRow(event.target);
		if (row && row !== current) void show(row);
	});
	plugin.registerDomEvent(document, 'mouseout', event => {
		const next = event.relatedTarget;
		if (next instanceof Node && (current?.contains(next) || tooltip?.contains(next))) return;
		clear();
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
