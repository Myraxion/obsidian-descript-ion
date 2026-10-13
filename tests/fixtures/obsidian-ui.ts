import { type App, type Plugin } from 'obsidian';

type Action = () => unknown;
type Listener = (...args: unknown[]) => unknown;
interface UiTarget { path: string }

/** Only the UI platform used by the production editor and its two entry points. */
export class UiElement {
	readonly children: UiElement[] = [];
	readonly classes = new Set<string>();
	readonly attributes = new Map<string, string>();
	readonly listeners = new Map<string, Action>();
	text = '';
	value = '';
	removed = false;
	private isDisabled = false;

	constructor(readonly tag = 'div', readonly ownerDocument?: UiHarness['document']) {}

	get disabled(): boolean { return this.isDisabled; }
	set disabled(value: boolean) {
		this.assertAttached();
		this.isDisabled = value;
	}

	createEl(tag: string, options: { text?: string; cls?: string; attr?: Record<string, string> } = {}): UiElement {
		this.assertAttached();
		const child = new UiElement(tag, this.ownerDocument);
		child.text = options.text ?? '';
		if (options.cls) child.addClass(options.cls);
		for (const [key, value] of Object.entries(options.attr ?? {})) child.setAttribute(key, value);
		this.children.push(child);
		return child;
	}

	addClass(...classes: string[]): void { classes.forEach(name => this.classes.add(name)); }
	removeClass(...classes: string[]): void { classes.forEach(name => this.classes.delete(name)); }
	setAttribute(key: string, value: string): void { this.attributes.set(key, value); }
	removeAttribute(key: string): void { this.attributes.delete(key); }
	setText(text: string): void { this.assertAttached(); this.text = text; }
	focus(): void { this.assertAttached(); }
	empty(): void { this.children.forEach(child => child.remove()); this.children.length = 0; this.text = ''; }
	remove(): void { this.removed = true; this.children.forEach(child => child.remove()); }
	click(): unknown { return this.disabled ? undefined : this.listeners.get('click')?.(); }

	private assertAttached(): void {
		if (this.removed) throw new Error('Updated a closed UI element');
	}
}

const harnesses = new WeakMap<App, UiHarness>();

export class Modal {
	readonly contentEl = new UiElement();
	readonly scope = {
		register: (modifiers: string[], key: string, action: Action) => {
			this.shortcuts.set([...modifiers, key].join('+'), action);
		},
	};
	private readonly shortcuts = new Map<string, Action>();
	private readonly ui: UiHarness;
	title = '';
	visible = false;

	constructor(app: App) { this.ui = harnesses.get(app)!; }
	setTitle(title: string): void { this.title = title; }
	onOpen(): void {}
	onClose(): void {}
	open(): void { this.visible = true; this.ui.modals.add(this); this.onOpen(); }
	close(): void {
		if (!this.visible) throw new Error('Closed an already closed editor');
		this.visible = false;
		this.ui.modals.delete(this);
		this.onClose();
	}
	press(key: string): void {
		if (key === 'Escape') this.close();
		else this.shortcuts.get(key)?.();
	}
}

class Button {
	readonly buttonEl: UiElement;
	constructor(container: UiElement) { this.buttonEl = container.createEl('button'); }
	setButtonText(text: string): this { this.buttonEl.setText(text); return this; }
	setCta(): this { return this; }
	onClick(action: Action): this { this.buttonEl.listeners.set('click', action); return this; }
}

export class Setting {
	constructor(private readonly container: UiElement) {}
	addButton(create: (button: Button) => void): this { create(new Button(this.container)); return this; }
}

export class Notice {
	static messages: string[] = [];
	constructor(message: string) { Notice.messages.push(message); }
}

export class UiHarness {
	readonly modals = new Set<Modal>();
	readonly targets = new Map<string, UiTarget>();
	activeFile: UiTarget | null = null;
	readonly timers = new Map<number, Action>();
	private timerId = 0;
	private readonly cleanup: Action[] = [];
	private readonly events = new Map<string, Set<Listener>>();
	readonly document = {
		defaultView: {
			setTimeout: (action: Action): number => {
				const id = ++this.timerId;
				this.timers.set(id, action);
				return id;
			},
			clearTimeout: (id: number): void => { this.timers.delete(id); },
		},
	};
	readonly status = new UiElement('div', this.document);
	readonly app = {
		vault: { getAbstractFileByPath: (path: string) => this.targets.get(path) ?? null },
		workspace: {
			containerEl: new UiElement('div', this.document),
			getActiveFile: () => this.activeFile,
			on: (name: string, callback: Listener) => {
				const listeners = this.events.get(name) ?? new Set<Listener>();
				listeners.add(callback);
				this.events.set(name, listeners);
				return { dispose: () => listeners.delete(callback) };
			},
		},
	} as unknown as App;
	readonly plugin = {
		app: this.app,
		register: (action: Action) => this.cleanup.push(action),
		registerEvent: (event: { dispose: Action }) => this.cleanup.push(event.dispose),
		registerDomEvent: (element: UiElement, name: string, action: Action) => {
			element.listeners.set(name, action);
			this.cleanup.push(() => element.listeners.delete(name));
		},
		addStatusBarItem: () => this.status,
	} as unknown as Plugin;

	constructor() { harnesses.set(this.app, this); }
	addTarget(path: string): UiTarget {
		const file = { path };
		this.targets.set(path, file);
		return file;
	}
	emit(name: string, ...args: unknown[]): void { this.events.get(name)?.forEach(listener => listener(...args)); }
	menu(file: UiTarget): Action {
		let action: Action | undefined;
		const item = {
			setTitle: () => item,
			setIcon: () => item,
			onClick: (click: Action) => { action = click; return item; },
		};
		this.emit('file-menu', { addItem: (create: (menuItem: typeof item) => void) => create(item) }, file);
		if (!action) throw new Error('Missing edit menu item');
		return action;
	}
	runTimers(): void {
		const pending = [...this.timers.values()];
		this.timers.clear();
		pending.forEach(action => action());
	}
	unload(): void { this.cleanup.splice(0).reverse().forEach(action => action()); }
}
