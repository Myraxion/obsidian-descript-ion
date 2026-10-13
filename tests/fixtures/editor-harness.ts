import { setImmediate } from 'node:timers/promises';
import { CommentService } from '../../src/comments/service';
import { CommentEditor } from '../../src/ui/comment-editor';
import { registerCommentMenu } from '../../src/ui/context-menu';
import { registerStatusBarComment } from '../../src/ui/status-bar';
import { MemoryStorage } from './memory-storage';
import { type Modal, Notice, UiHarness } from './obsidian-ui';

export const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
export const settle = (): Promise<void> => setImmediate();

export async function editorHarness() {
	Notice.messages = [];
	const ui = new UiHarness();
	const file = ui.addTarget('a.md');
	const other = ui.addTarget('b.md');
	ui.activeFile = file;
	const storage = new MemoryStorage();
	storage.targets.set(file.path, { identity: file, revision: 0 });
	storage.targets.set(other.path, { identity: other, revision: 0 });
	storage.files.set('descript.ion', utf8('a.md Old comment\r\n'));
	const comments = new CommentService(storage, () => status.refresh());
	const editor = new CommentEditor(ui.plugin, comments);
	registerCommentMenu(ui.plugin, editor);
	const status = registerStatusBarComment(ui.plugin, comments, editor);
	await settle();
	return { ui, file, other, storage, status };
}

export function modalInput(modal: Modal) {
	return modal.contentEl.children.find(child => child.tag === 'textarea')!;
}

export function modalMessage(modal: Modal) {
	return modal.contentEl.children.find(child => child.classes.has('descript-ion-message'))!;
}

export function modalButton(modal: Modal, text: string) {
	return modal.contentEl.children.find(child => child.tag === 'button' && child.text === text)!;
}

export function gate() {
	let release!: () => void;
	let enter!: () => void;
	const waiting = new Promise<void>(resolve => { release = resolve; });
	const began = new Promise<void>(resolve => { enter = resolve; });
	return { waiting, began, release, enter };
}

export function pauseRead(storage: MemoryStorage) {
	const paused = gate();
	const read = storage.read.bind(storage);
	let first = true;
	storage.read = async path => {
		const bytes = await read(path);
		if (first) {
			first = false;
			paused.enter();
			await paused.waiting;
		}
		return bytes;
	};
	return paused;
}

export function pauseCommit(storage: MemoryStorage, fail = false) {
	const paused = gate();
	const commit = storage.commit.bind(storage);
	storage.commit = async (path, bytes, check) => {
		paused.enter();
		await paused.waiting;
		if (fail) throw new Error('Storage failed');
		await commit(path, bytes, check);
	};
	return paused;
}
