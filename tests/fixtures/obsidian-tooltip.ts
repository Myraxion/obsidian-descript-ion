// Runtime boundary for the DOM hover regression harness, not an Obsidian UI clone.
export class TFile {
	constructor(public path: string, public basename: string, public stat = { mtime: 100, ctime: 50 }) {}
}

export class TFolder {
	constructor(public path: string, private files = 3, private folders = 2) {}
	getFileCount(): number { return this.files; }
	getFolderCount(): number { return this.folders; }
}

export function moment(time: number): { format: (pattern: string) => string } {
	return { format: () => time === 100 ? '2026-10-09 12:00' : '2026-10-09 11:00' };
}

export function displayTooltip(row: HTMLElement, content: string | DocumentFragment, options?: { classes?: string[] }): void {
	const tooltip = row.ownerDocument.body.createDiv({ cls: ['tooltip', ...options?.classes ?? []].join(' ') });
	if (typeof content === 'string') tooltip.textContent = content;
	else tooltip.appendChild(content);
}
