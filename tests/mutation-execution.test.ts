import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CommentService } from '../src/comments/service';
import { MemoryStorage } from './fixtures/memory-storage';

const utf8 = (text: string) => new TextEncoder().encode(text);

function pauseCommit(storage: MemoryStorage, matches: (path: string) => boolean) {
	let release!: () => void;
	let entered!: () => void;
	let paused = false;
	const gate = new Promise<void>(resolve => { release = resolve; });
	const began = new Promise<void>(resolve => { entered = resolve; });
	const commit = storage.commit.bind(storage);
	storage.commit = async (path, bytes, check) => {
		if (!paused && matches(path)) {
			paused = true;
			entered();
			await gate;
		}
		await commit(path, bytes, check);
	};
	return { began, release };
}

for (const saveFirst of [true, false]) {
	void test(`${saveFirst ? '保存先于维护' : '维护先于保存'}时共用修改队列，保留备注且阻止旧编辑覆盖`, async () => {
		const storage = new MemoryStorage('A/a.md');
		storage.files.set('A/descript.ion', utf8('a.md 原备注\r\nb.md 第二条\r\n'));
		const service = new CommentService(storage);
		const opened = await service.open('A/a.md');
		if (opened.status !== 'ok') throw new Error(opened.code);
		const paused = pauseCommit(storage, path => path === 'A/descript.ion');
		const first = saveFirst ? service.save(opened.session, '新备注') : service.rename('A/b.md', 'A/c.md');
		await paused.began;
		const second = saveFirst ? service.rename('A/b.md', 'A/c.md') : service.save(opened.session, '新备注');
		paused.release();
		assert.deepEqual(await first, { status: 'ok' });
		assert.deepEqual(await second, saveFirst ? { status: 'ok' } : { status: 'stale', code: 'stale_file' });
		assert.deepEqual(storage.files.get('A/descript.ion'), utf8(`\uFEFFa.md ${saveFirst ? '新备注' : '原备注'}\r\nc.md 第二条\r\n`));
	});
}

void test('保存阻塞时排队维护立即跟随目录移动，普通读取不等待修改队列', async () => {
	const storage = new MemoryStorage('block.md');
	storage.files.set('descript.ion', utf8('block.md 原备注\r\n'));
	storage.files.set('A/descript.ion', utf8('x.md 文件备注\r\n'));
	const service = new CommentService(storage);
	const opened = await service.open('block.md');
	if (opened.status !== 'ok') throw new Error(opened.code);
	const paused = pauseCommit(storage, path => path === 'descript.ion');
	const saving = service.save(opened.session, '新备注');
	await paused.began;
	const moving = service.rename('A/x.md', 'B/x.md');
	storage.files.set('Z/descript.ion', storage.files.get('A/descript.ion')!);
	storage.files.delete('A/descript.ion');
	const folder = service.rename('A', 'Z', true);
	const reading = await service.open('block.md');
	assert.equal(reading.status === 'ok' ? reading.comment : reading.code, '原备注');
	paused.release();
	assert.deepEqual(await saving, { status: 'ok' });
	assert.deepEqual(await moving, { status: 'ok' });
	assert.deepEqual(await folder, { status: 'ok' });
	assert.deepEqual(storage.files.get('B/descript.ion'), utf8('\uFEFFx.md 文件备注\r\n'));
	assert.equal(storage.files.has('A/descript.ion'), false);
	assert.equal(storage.files.has('Z/descript.ion'), false);
	assert.deepEqual(storage.files.get('descript.ion'), utf8('\uFEFFblock.md 新备注\r\n'));
});

for (const queued of [true, false]) {
	for (const removed of [true, false]) {
		void test(`直接${removed ? '删除' : '移动'}备注文件使${queued ? '排队' : '已开始'}维护立即失效，后续有效维护继续执行`, async () => {
			const storage = new MemoryStorage('block.md');
			const original = utf8('x.md 文件备注\r\n');
			storage.files.set('A/descript.ion', original);
			storage.files.set('C/descript.ion', utf8('y.md 后续备注\r\n'));
			storage.files.set('descript.ion', utf8('block.md 原备注\r\n'));
			const service = new CommentService(storage);
			const opened = await service.open('block.md');
			if (opened.status !== 'ok') throw new Error(opened.code);
			const paused = pauseCommit(storage, path => path === (queued ? 'descript.ion' : 'B/descript.ion'));
			const saving = queued ? service.save(opened.session, '新备注') : null;
			if (queued) await paused.began;
			const moving = service.rename('A/x.md', 'B/x.md');
			if (!queued) await paused.began;
			storage.files.delete('A/descript.ion');
			if (!removed) storage.files.set('Archive/descript.ion', original);
			const changed = removed
				? service.remove('A/descript.ion')
				: service.rename('A/descript.ion', 'Archive/descript.ion');
			const later = service.rename('C/y.md', 'C/z.md');
			paused.release();
			if (saving) assert.deepEqual(await saving, { status: 'ok' });
			assert.deepEqual(await moving, { status: 'stale', code: 'lifecycle_changed' });
			assert.deepEqual(await changed, { status: 'ok' });
			assert.deepEqual(await later, { status: 'ok' });
			assert.equal(storage.files.has('A/descript.ion'), false);
			assert.equal(storage.files.has('B/descript.ion'), false);
			assert.deepEqual(storage.files.get('Archive/descript.ion') ?? null, removed ? null : original);
			assert.deepEqual(storage.files.get('C/descript.ion'), utf8('\uFEFFz.md 后续备注\r\n'));
		});
	}
}
