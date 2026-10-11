import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { type Plugin } from 'obsidian';
import { VaultCommentStorage } from '../src/comments/vault-storage';

interface Target {
	path: string;
	parent?: Target | null;
}

function setup() {
	const files = new Map<string, Target>();
	const events = new Map<string, (file: Target, oldPath?: string) => void>();
	const plugin = {
		app: { vault: {
			adapter: { exists: async (path: string) => files.has(path) },
			getAbstractFileByPath: (path: string) => files.get(path),
			on: (event: string, callback: (file: Target, oldPath?: string) => void) => { events.set(event, callback); return {}; },
		} },
		registerEvent: () => {}, register: () => {},
	} as unknown as Plugin;
	return { files, events, storage: new VaultCommentStorage(plugin) };
}

void test('读取后删除的备注对象可被回收，无需卸载插件', { skip: typeof global.gc !== 'function' }, async () => {
	const { files, events, storage } = setup();
	async function visitAndDelete() {
		const refs: WeakRef<Target>[] = [];
		for (let i = 0; i < 100; i++) {
			const target = { path: `${i}.md` };
			files.set(target.path, target);
			await storage.target(target.path);
			refs.push(new WeakRef(target));
			events.get('delete')!(target);
			files.delete(target.path);
		}
		return refs;
	}
	const refs = await visitAndDelete();
	for (let i = 0; i < 3; i++) {
		await setImmediate();
		global.gc!();
	}
	assert.equal(refs.filter(ref => ref.deref() !== undefined).length, 0);
	assert.equal(await storage.target('missing.md'), null);
});

void test('祖先目录重命名后返回原路径仍使目标版本失效，兄弟目录目标不受影响', async () => {
	const { files, events, storage } = setup();
	const folder = { path: 'A' };
	const file = { path: 'A/x.md', parent: folder };
	const sibling = { path: 'B/y.md', parent: { path: 'B' } };
	files.set(file.path, file);
	files.set(sibling.path, sibling);
	const original = await storage.target(file.path);
	const other = await storage.target(sibling.path);
	folder.path = 'Z';
	file.path = 'Z/x.md';
	events.get('rename')!(folder, 'A');
	folder.path = 'A';
	file.path = 'A/x.md';
	events.get('rename')!(folder, 'Z');
	const current = await storage.target(file.path);
	assert.equal(current?.identity, original?.identity);
	assert.notEqual(current?.revision, original?.revision);
	assert.deepEqual(await storage.target(sibling.path), other);
});
