import { setTimeout as nodeSetTimeout, clearTimeout as nodeClearTimeout } from 'node:timers';

import { type Plugin } from 'obsidian';
import { TFile, TFolder } from './obsidian-tooltip';
import { registerFileTreeTooltip } from '../../src/ui/file-tree-tooltip';
import { CommentService, type CommentStorage } from '../../src/comments/service';

// Minimal browser/Plugin boundary: native delegation and both pointer/mouse events
// run against the real registration entry point. Real layout is manually verified.
class ElementBoundary {
	children: ElementBoundary[] = [];
	parentElement: ElementBoundary | null = null;
	attributes = new Map<string, string>();
	textContent = '';
	cls = '';
	get className(): string { return this.cls; }
	set className(value: string) { this.cls = value; }
	isConnected = true;
	constructor(public ownerDocument: DocumentBoundary, public kind = '') {}
	get offsetWidth(): number { return 200; }
	get offsetHeight(): number { return 50; }
	closest(): ElementBoundary | null { return this.kind === 'row' ? this : this.parentElement?.closest() ?? null; }
	contains(node: unknown): boolean { return node === this || this.children.some(child => child.contains(node)); }
	getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
	setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
	addClass(name: string): void { this.cls += ' ' + name; }
	setCssProps(): void {}
	getBoundingClientRect(): { right: number; top: number } { return { right: 250, top: 10 }; }
	appendChild(child: ElementBoundary): ElementBoundary {
		child.parentElement = this;
		this.children.push(child);
		return child;
	}
	createDiv(options: { cls?: string; text?: string } = {}): ElementBoundary {
		const child = new ElementBoundary(this.ownerDocument);
		child.cls = options.cls ?? '';
		child.textContent = options.text ?? '';
		return this.appendChild(child);
	}
	remove(): void {
		if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
		this.isConnected = false;
	}
	querySelectorAll(selector: string): ElementBoundary[] {
		const classes = selector.split('.').filter(Boolean);
		return this.children.flatMap(child => [
			...(classes.every(cls => child.cls.split(' ').includes(cls)) ? [child] : []),
			...child.querySelectorAll(selector),
		]);
	}
}

class DocumentBoundary {
	body = new ElementBoundary(this);
	defaultView = {
		setTimeout: (callback: () => void, delay: number) => nodeSetTimeout(callback, delay),
		clearTimeout: (timer: ReturnType<typeof setTimeout>) => nodeClearTimeout(timer),
		innerWidth: 1000, innerHeight: 800,
		i18next: { t: (key: string, values: { time?: string; count?: number }) => {
			if (key.endsWith('tooltip-modified-time')) return `最后修改于 ${values.time}`;
			if (key.endsWith('tooltip-created-time')) return `创建于 ${values.time}`;
			return `${values.count} 个${key === 'nouns.file-with-count' ? '文件' : '文件夹'}`;
		} },
	};
	createDocumentFragment(): ElementBoundary { return new ElementBoundary(this); }
	createElement(): ElementBoundary { return new ElementBoundary(this); }
	querySelectorAll(selector: string): ElementBoundary[] { return this.body.querySelectorAll(selector); }
}

export function harness(comment = '中文\\n**备注** <b>文本</b>\x04\u00C2', folder = false) {
	const document = new DocumentBoundary();
	const row = document.body.createDiv();
	row.kind = 'row';
	row.setAttribute('data-path', folder ? '目录' : '笔记.md');
	const file = folder ? new TFolder('目录') : new TFile('笔记.md', '笔记');
	const listeners: { type: string; callback: (event: PointerEvent) => void; capture: boolean }[] = [];
	const cleanups: (() => void)[] = [];
	let nativeTimer: ReturnType<typeof setTimeout> | undefined;
	let nativeCalls = 0;
	let previews = 0;
	const previewEvents: { event: PointerEvent; source: string; linktext: string }[] = [];
	const view = {
		containerEl: document.body,
		files: new Map([[row.parentElement, file]]),
		fileItems: { [file.path]: { getTitle: () => folder ? '目录' : '笔记', isFullTitleShown: () => false } },
		getSideTooltipPlacement: () => 'right',
		onFilePointerover: () => {
			nativeCalls++;
			if (!folder) previews++;
			nativeTimer = nodeSetTimeout(() => document.body.createDiv({ cls: 'tooltip', text: '原官方提示' }), 1000);
		},
		onFilePointerout: () => {
			nodeClearTimeout(nativeTimer);
			for (const tooltip of document.querySelectorAll('.tooltip')) tooltip.remove();
		},
	};
	let bytes = comment ? new TextEncoder().encode(`${file.path} ${comment}\r\n`) : null;
	let delayRead: (() => Promise<void>) | undefined;
	const storage: CommentStorage = {
		target: async () => ({ identity: file, revision: 0 }),
		read: async () => { const snapshot = bytes; await delayRead?.(); return snapshot; },
		write: async () => { throw new Error('hover must not write'); },
		remove: async () => { throw new Error('hover must not remove'); },
	};
	const plugin = {
		app: { workspace: {
			containerEl: document.body, getLeavesOfType: () => [{ view }], on: () => ({}),
			trigger: (_name: string, event: { event: PointerEvent; source: string; linktext: string }) => { previews++; previewEvents.push(event); },
		} },
		registerDomEvent: (_element: unknown, type: string, callback: (event: PointerEvent) => void, capture?: boolean) => {
			const listener = { type, callback, capture: !!capture };
			listeners.push(listener);
			cleanups.push(() => listeners.splice(listeners.indexOf(listener), 1));
		},
		registerEvent: () => {}, register: (cleanup: () => void) => cleanups.push(cleanup),
	} as unknown as Plugin;
	Object.assign(global, { Element: ElementBoundary, HTMLElement: ElementBoundary, Node: ElementBoundary });
	const enable = () => registerFileTreeTooltip(plugin, new CommentService(storage));
	const unload = () => { for (const cleanup of [...cleanups].reverse()) cleanup(); cleanups.length = 0; };
	enable();
	function dispatch(type: string, relatedTarget: ElementBoundary | null = null): PointerEvent {
		let stopped = false;
		const event = { target: row, relatedTarget, pointerType: 'mouse', stopPropagation: () => { stopped = true; } } as unknown as PointerEvent;
		for (const listener of listeners.filter(listener => listener.type === type && listener.capture)) listener.callback(event);
		if (!stopped && type === 'pointerover') view.onFilePointerover();
		if (!stopped && type === 'pointerout') view.onFilePointerout();
		if (!stopped) for (const listener of listeners.filter(listener => listener.type === type && !listener.capture)) listener.callback(event);
		return event;
	}
	return {
		document, dispatch, tooltips: () => document.body.children.filter(child => child !== row),
		text: () => document.querySelectorAll('.tooltip').map(tooltip => tooltip.children.map(fragment => fragment.children.map(section => section.textContent).join('\n')).join('')),
		setComment: (text: string) => { bytes = text ? new TextEncoder().encode(`${file.path} ${text}\r\n`) : null; },
		delayRead: (read: () => Promise<void>) => { delayRead = read; },
		nativeCalls: () => nativeCalls, previews: () => previews, previewEvents: () => previewEvents,
		unload, enable,
	};
}


