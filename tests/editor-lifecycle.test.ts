import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editorHarness, modalInput, pauseRead, settle, utf8 } from './fixtures/editor-harness';
import { Notice } from './fixtures/obsidian-ui';

void test('状态栏展示刷新不取消编辑打开，也不被旧编辑读取覆盖', async () => {
	const { ui, storage, status } = await editorHarness();
	const paused = pauseRead(storage);
	const opening = ui.status.click();
	await paused.began;
	storage.files.set('descript.ion', utf8('a.md Fresh comment\r\n'));
	status.refresh();
	ui.runTimers();
	await settle();
	assert.equal(ui.status.text, 'Fresh comment');
	paused.release();
	await opening;
	assert.equal(ui.modals.size, 1);
	assert.equal(modalInput([...ui.modals][0]!).value, 'Old comment');
	assert.equal(ui.status.text, 'Fresh comment');
	ui.unload();
});

void test('状态栏新点击淘汰旧待完成点击，右键编辑和已有弹窗仍独立', async () => {
	const { ui, storage, file } = await editorHarness();
	const paused = pauseRead(storage);
	const first = ui.status.click();
	await paused.began;
	await ui.menu(file)();
	await ui.status.click();
	paused.release();
	await first;
	assert.equal(ui.modals.size, 2);
	const [menu, status] = [...ui.modals];
	menu!.press('Escape');
	assert.equal(status!.visible, true);
	assert.equal(ui.modals.size, 1);
	ui.unload();
});

void test('右键打开请求彼此不淘汰，按各自读取结果显示备注对象', async () => {
	const { ui, storage, file, other } = await editorHarness();
	const paused = pauseRead(storage);
	const first = ui.menu(file)();
	await paused.began;
	await ui.menu(other)();
	paused.release();
	await first;
	assert.equal(ui.modals.size, 2);
	assert.deepEqual([...ui.modals].map(modal => modal.contentEl.children[0]!.text), ['b.md', 'a.md']);
	ui.unload();
});

void test('状态栏打开期间切换活动对象后丢弃旧编辑请求', async () => {
	const { ui, storage, other, status } = await editorHarness();
	const paused = pauseRead(storage);
	const opening = ui.status.click();
	await paused.began;
	ui.activeFile = other;
	status.refresh();
	ui.runTimers();
	await settle();
	paused.release();
	await opening;
	assert.equal(ui.modals.size, 0);
	assert.equal(ui.status.text, 'Add comment');
	assert.deepEqual(Notice.messages, []);
	ui.unload();
});

for (const entry of ['menu', 'status'] as const) {
	for (const change of ['rename', 'delete', 'replace'] as const) {
		void test(`${entry} 打开期间对象${change}后不显示过期编辑器`, async () => {
			const { ui, storage, file } = await editorHarness();
			const paused = pauseRead(storage);
			const opening = entry === 'menu' ? ui.menu(file)() : ui.status.click();
			await paused.began;
			ui.targets.delete('a.md');
			if (change === 'rename') { file.path = 'moved.md'; ui.targets.set(file.path, file); }
			if (change === 'replace') ui.addTarget('a.md');
			paused.release();
			await opening;
			assert.equal(ui.modals.size, 0);
			assert.deepEqual(Notice.messages, []);
			ui.unload();
		});
	}

	for (const failed of [false, true]) {
		void test(`${entry} 读取${failed ? '失败' : '成功'}前卸载，迟到结果不生成 UI`, async () => {
			const { ui, storage, file, status } = await editorHarness();
			if (failed) storage.files.set('descript.ion', new Uint8Array([0xff]));
			const paused = pauseRead(storage);
			const opening = entry === 'menu' ? ui.menu(file)() : ui.status.click();
			await paused.began;
			ui.unload();
			status.refresh();
			paused.release();
			await opening;
			assert.equal(ui.modals.size, 0);
			assert.equal(ui.status.removed, true);
			assert.equal(ui.timers.size, 0);
			assert.deepEqual(Notice.messages, []);
		});
	}

	void test(`${entry} 有效读取失败提示原因，状态栏点击也显示失败结果`, async () => {
		const { ui, storage, file } = await editorHarness();
		storage.files.set('descript.ion', new Uint8Array([0xff]));
		await (entry === 'menu' ? ui.menu(file)() : ui.status.click());
		assert.equal(ui.modals.size, 0);
		assert.deepEqual(Notice.messages, ['Description file is not valid UTF-8 and cannot be modified.']);
		if (entry === 'status') assert.equal(ui.status.text, Notice.messages[0]);
		ui.unload();
	});
}

void test('卸载关闭两个入口的已有编辑器，不为关闭安排额外读取', async () => {
	const { ui, storage, file } = await editorHarness();
	await ui.menu(file)();
	await ui.status.click();
	const modals = [...ui.modals];
	// No public UI interaction remains that should need storage after disposal.
	let readAfterUnload = false;
	storage.read = () => { readAfterUnload = true; throw new Error('Read after UI unload'); };
	ui.unload();
	await settle();
	assert.equal(ui.modals.size, 0);
	assert.equal(modals.every(modal => !modal.visible && modal.contentEl.children.length === 0), true);
	assert.equal(readAfterUnload, false);
	assert.deepEqual(Notice.messages, []);
});
