import { type HoverParent, type Plugin, type TAbstractFile, TFile, TFolder, moment, type TooltipPlacement } from 'obsidian';

interface ExplorerItem {
	getTitle(): string;
	isFullTitleShown(): boolean;
}

interface FileExplorer extends HoverParent {
	containerEl: HTMLElement;
	files: { get(element: HTMLElement): TAbstractFile | undefined };
	fileItems: Record<string, ExplorerItem>;
	getSideTooltipPlacement(): TooltipPlacement;
	onFilePointerover(event: PointerEvent, row: HTMLElement): void;
	onFilePointerout(event: PointerEvent, row: HTMLElement): void;
}

interface LocalizedWindow extends Window {
	i18next: { t(key: string, values: { time?: string; count?: number }): string };
}

interface CountedFolder extends TFolder {
	getFileCount(): number;
	getFolderCount(): number;
}

export interface NativeHover {
	view: FileExplorer;
	file: TAbstractFile;
	row: HTMLElement;
}

// Private FileExplorer/i18next contract verified against Obsidian 1.14.4.
// Keep discovery, official content and original interactions in this adapter.
export function nativeHover(plugin: Plugin, target: EventTarget | null): NativeHover | null {
	if (!(target instanceof Element)) return null;
	const row = target.closest<HTMLElement>('.nav-file-title[data-path], .nav-folder-title[data-path]');
	if (!row?.parentElement) return null;
	const view = plugin.app.workspace.getLeavesOfType('file-explorer')
		.map(leaf => leaf.view as unknown as FileExplorer)
		.find(view => view.containerEl.contains(row));
	const file = view?.files?.get(row.parentElement);
	return view && file ? { view, file, row } : null;
}

export function officialTooltip(hover: NativeHover): string {
	const { view, file, row } = hover;
	const item = view.fileItems[file.path];
	const title = item && !item.isFullTitleShown() ? item.getTitle() + '\n\n' : '';
	const { i18next } = row.ownerDocument.defaultView as unknown as LocalizedWindow;
	if (file instanceof TFile) {
		const modified = i18next.t('plugins.file-explorer.tooltip-modified-time', { time: moment(file.stat.mtime).format('YYYY-MM-DD HH:mm') });
		const created = i18next.t('plugins.file-explorer.tooltip-created-time', { time: moment(file.stat.ctime).format('YYYY-MM-DD HH:mm') });
		return title + modified + '\n' + created;
	}
	if (file instanceof TFolder) {
		const folder = file as CountedFolder;
		const files = i18next.t('nouns.file-with-count', { count: folder.getFileCount() });
		const folders = i18next.t('nouns.folder-with-count', { count: folder.getFolderCount() });
		return title + files + ', ' + folders;
	}
	return title;
}

export function previewFile(plugin: Plugin, hover: NativeHover, event: PointerEvent): void {
	if (hover.file instanceof TFile) {
		plugin.app.workspace.trigger('hover-link', {
			event, source: 'file-explorer', hoverParent: hover.view, targetEl: hover.row, linktext: hover.file.path,
		});
	}
}

export function cancelNativeHover(hover: NativeHover): void {
	// The original pointerout cancels its private pending timer and shared tooltip.
	// Only call while this row owns the hover, before another row is allowed through.
	hover.view.onFilePointerout({ pointerType: 'mouse', relatedTarget: null } as PointerEvent, hover.row);
}
