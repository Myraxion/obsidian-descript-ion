import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommentService, type CommentStorage } from '../src/comments/service';

const utf8 = (text: string) => new TextEncoder().encode(text);

class RaceStorage implements CommentStorage {
	files = new Map<string, Uint8Array>();
	targets = new Map<string, { identity: object; revision: number }>();
	async target(path: string) { return this.targets.get(path) ?? null; }
	async read(path: string) { return this.files.get(path)?.slice() ?? null; }
	async write(path: string, bytes: Uint8Array, beforeCommit?: () => void | Promise<void>) {
		await beforeCommit?.();
		this.files.set(path, bytes.slice());
	}
	async remove(path: string) { this.files.delete(path); }
}

void test('排队中的文件备注迁移跟随源父目录的后续重命名', async () => {
	const storage = new RaceStorage();
	storage.files.set('descript.ion', utf8('A 文件夹备注\r\n'));
	storage.files.set('A/descript.ion', utf8('x.md 文件备注\r\n'));
	storage.targets.set('B/x.md', { identity: {}, revision: 0 });
	const service = new CommentService(storage);
	const movingFile = service.rename('A/x.md', 'B/x.md');
	storage.files.set('Z/descript.ion', storage.files.get('A/descript.ion')!);
	storage.files.delete('A/descript.ion');
	const movingFolder = service.rename('A', 'Z', true);
	assert.equal((await movingFile).status, 'ok');
	assert.equal((await movingFolder).status, 'ok');
	const opened = await service.open('B/x.md');
	assert.equal(opened.status === 'ok' ? opened.comment : opened.code, '文件备注');
	assert.equal(storage.files.has('Z/descript.ion'), false);
	assert.deepEqual(storage.files.get('descript.ion'), utf8('\uFEFFZ 文件夹备注\r\n'));
});

void test('维护已开始后源父目录移动，明确报告停止且不重建旧目录备注文件', async () => {
	const storage = new RaceStorage();
	const original = utf8('x.md 文件备注\r\n');
	storage.files.set('A/descript.ion', original);
	let release!: () => void;
	let entered!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	const began = new Promise<void>(resolve => { entered = resolve; });
	const read = storage.read.bind(storage);
	storage.read = async path => {
		const bytes = await read(path);
		if (path === 'A/descript.ion') { entered(); await gate; }
		return bytes;
	};
	const service = new CommentService(storage);
	const moving = service.rename('A/x.md', 'B/x.md');
	await began;
	storage.files.set('Z/descript.ion', original);
	storage.files.delete('A/descript.ion');
	const folder = service.rename('A', 'Z', true);
	release();
	assert.deepEqual(await moving, { status: 'stale', code: 'lifecycle_changed' });
	await folder;
	assert.deepEqual([...storage.files.keys()], ['Z/descript.ion']);
	assert.deepEqual(storage.files.get('Z/descript.ion'), original);
});

void test('排队中的迁移跟随目标父目录移动，并且删除父目录后不重建元数据', async () => {
	const storage = new RaceStorage();
	storage.files.set('A/descript.ion', utf8('x.md 文件备注\r\n'));
	const service = new CommentService(storage);
	const moving = service.rename('A/x.md', 'B/x.md');
	const folder = service.rename('B', 'C', true);
	assert.equal((await moving).status, 'ok');
	await folder;
	assert.deepEqual(storage.files.get('C/descript.ion'), utf8('\uFEFFx.md 文件备注\r\n'));
	const movingAgain = service.rename('C/x.md', 'D/x.md');
	const deleting = service.remove('D', true);
	assert.deepEqual(await movingAgain, { status: 'stale', code: 'lifecycle_changed' });
	await deleting;
	assert.equal(storage.files.has('D/descript.ion'), false);
	assert.deepEqual(storage.files.get('C/descript.ion'), utf8('\uFEFFx.md 文件备注\r\n'));
});

void test('备注保存与删除成功后通知显示刷新，不依赖 Vault 是否索引备注文件', async () => {
	const storage = new RaceStorage();
	storage.targets.set('a.md', { identity: {}, revision: 0 });
	let displayed = '';
	let refresh: Promise<void> = Promise.resolve();
	const service = new CommentService(storage, () => {
		refresh = service.open('a.md').then(result => {
			if (result.status === 'ok') displayed = result.comment;
		});
	});
	const opened = await service.open('a.md');
	assert.equal(opened.status, 'ok');
	if (opened.status !== 'ok') return;
	await service.save(opened.session, '新备注');
	await refresh;
	assert.equal(displayed, '新备注');
	const editing = await service.open('a.md');
	if (editing.status !== 'ok') throw new Error(editing.code);
	await service.delete(editing.session);
	await refresh;
	assert.equal(displayed, '');
});

void test('写入准备期间目录移动，在提交前停止维护并保留源记录', async () => {
	const storage = new RaceStorage();
	const original = utf8('x.md 文件备注\r\n');
	storage.files.set('A/descript.ion', original);
	let release!: () => void;
	let entered!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	const began = new Promise<void>(resolve => { entered = resolve; });
	const write = storage.write.bind(storage);
	storage.write = async (path, bytes, beforeCommit) => {
		if (path === 'B/descript.ion') { entered(); await gate; }
		await write(path, bytes, beforeCommit);
	};
	const service = new CommentService(storage);
	const moving = service.rename('A/x.md', 'B/x.md');
	await began;
	const folder = service.rename('B', 'C', true);
	release();
	assert.deepEqual(await moving, { status: 'stale', code: 'lifecycle_changed' });
	await folder;
	assert.deepEqual([...storage.files.keys()], ['A/descript.ion']);
	assert.deepEqual(storage.files.get('A/descript.ion'), original);
});

void test('编辑保存准备写入期间目标被重命名，提交前返回 stale 且保留旧备注', async () => {
	const storage = new RaceStorage();
	storage.targets.set('a.md', { identity: {}, revision: 0 });
	const original = utf8('a.md 原备注\r\n');
	storage.files.set('descript.ion', original);
	let release!: () => void;
	let entered!: () => void;
	const gate = new Promise<void>(resolve => { release = resolve; });
	const began = new Promise<void>(resolve => { entered = resolve; });
	const write = storage.write.bind(storage);
	storage.write = async (path, bytes, beforeCommit) => {
		entered();
		await gate;
		await write(path, bytes, beforeCommit);
	};
	const service = new CommentService(storage);
	const opened = await service.open('a.md');
	if (opened.status !== 'ok') throw new Error(opened.code);
	const saving = service.save(opened.session, '新草稿');
	await began;
	storage.targets.delete('a.md');
	release();
	assert.deepEqual(await saving, { status: 'stale', code: 'stale_target' });
	assert.deepEqual(storage.files.get('descript.ion'), original);
});
