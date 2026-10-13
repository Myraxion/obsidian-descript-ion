import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editorHarness, modalButton, modalInput, modalMessage, pauseCommit, settle, utf8 } from './fixtures/editor-harness';
import { Notice } from './fixtures/obsidian-ui';

for (const remove of [false, true]) {
	for (const closing of ['cancel', 'escape', 'unload'] as const) {
		void test(`${remove ? '删除' : '保存'}等待提交时${closing}，存储完成但不操作已关闭编辑器`, async () => {
			const { ui, storage } = await editorHarness();
			await ui.status.click();
			const modal = [...ui.modals][0]!;
			modalInput(modal).value = 'Submitted comment';
			const message = modalMessage(modal);
			const paused = pauseCommit(storage);
			const submitting = modalButton(modal, remove ? 'Delete comment' : 'Save').click();
			await paused.began;
			assert.equal(modalButton(modal, 'Save').disabled, true);
			assert.equal(modalButton(modal, 'Delete comment').disabled, true);
			if (closing === 'unload') ui.unload();
			else if (closing === 'escape') modal.press('Escape');
			else modalButton(modal, 'Cancel').click();
			paused.release();
			await submitting;
			ui.runTimers();
			await settle();
			assert.equal(modal.visible, false);
			assert.equal(message.text, '');
			assert.deepEqual(Notice.messages, []);
			assert.deepEqual(storage.files.get('descript.ion') ?? null, remove ? null : utf8('\uFEFFa.md Submitted comment\r\n'));
			if (closing !== 'unload') {
				assert.equal(ui.status.text, remove ? 'Add comment' : 'Submitted comment');
				ui.unload();
			} else assert.equal(ui.timers.size, 0);
		});
	}
}

void test('关闭后的提交失败保留存储，不显示错误或操作移除后的消息', async () => {
	const { ui, storage, file } = await editorHarness();
	await ui.menu(file)();
	const modal = [...ui.modals][0]!;
	const message = modalMessage(modal);
	const paused = pauseCommit(storage, true);
	modalInput(modal).value = 'Draft';
	const submitting = modalButton(modal, 'Save').click();
	await paused.began;
	modalButton(modal, 'Cancel').click();
	paused.release();
	await submitting;
	assert.deepEqual(storage.files.get('descript.ion'), utf8('a.md Old comment\r\n'));
	assert.equal(message.text, '');
	assert.deepEqual(Notice.messages, []);
	ui.unload();
});

for (const failure of ['stale', 'readonly'] as const) {
	void test(`${failure} 提交保留草稿并阻止再次保存和删除`, async () => {
		const { ui, storage, file } = await editorHarness();
		await ui.menu(file)();
		const modal = [...ui.modals][0]!;
		modalInput(modal).value = 'My draft';
		const changed = utf8(failure === 'stale' ? 'a.md External comment\r\n' : 'a.md One\r\na.md Two\r\n');
		storage.files.set('descript.ion', changed);
		await modalButton(modal, 'Save').click();
		assert.equal(modal.visible, true);
		assert.equal(modalInput(modal).value, 'My draft');
		assert.equal(modalMessage(modal).text, failure === 'stale'
			? 'Description file has changed. Input preserved, please reopen and verify the latest comment.'
			: 'Description file contains duplicate names and cannot be modified.');
		assert.equal(modalButton(modal, 'Save').disabled, true);
		assert.equal(modalButton(modal, 'Delete comment').disabled, true);
		modal.press('Mod+Enter');
		await settle();
		assert.deepEqual(storage.files.get('descript.ion'), changed);
		ui.unload();
	});
}

void test('超限失败保留输入且允许缩短后用快捷键重试，无 Vault 事件也刷新状态栏', async () => {
	const { ui, storage, file } = await editorHarness();
	await ui.menu(file)();
	const modal = [...ui.modals][0]!;
	modalInput(modal).value = 'x'.repeat(5000);
	await modalButton(modal, 'Save').click();
	assert.equal(modalInput(modal).value.length, 5000);
	assert.equal(modalMessage(modal).text, 'Complete comment record exceeds 4096 bytes, please shorten input and try again.');
	assert.equal(modalButton(modal, 'Save').disabled, false);
	modalInput(modal).value = 'Short comment';
	modal.press('Mod+Enter');
	await settle();
	ui.runTimers();
	await settle();
	assert.equal(modal.visible, false);
	assert.equal(ui.status.text, 'Short comment');
	assert.deepEqual(storage.files.get('descript.ion'), utf8('\uFEFFa.md Short comment\r\n'));
	assert.deepEqual(Notice.messages, ['Comment saved']);
	ui.unload();
});

void test('存储失败保留可编辑草稿，重试成功后通知与状态栏正确', async () => {
	const { ui, storage, file } = await editorHarness();
	await ui.menu(file)();
	const modal = [...ui.modals][0]!;
	modalInput(modal).value = 'Draft';
	const commit = storage.commit.bind(storage);
	storage.commit = () => { throw new Error('Read-only disk'); };
	await modalButton(modal, 'Save').click();
	assert.equal(modal.visible, true);
	assert.equal(modalInput(modal).value, 'Draft');
	assert.equal(modalMessage(modal).text, 'Cannot read or write description file, please check file permissions and try again.');
	assert.equal(modalButton(modal, 'Save').disabled, false);
	storage.commit = commit;
	await modalButton(modal, 'Save').click();
	ui.runTimers();
	await settle();
	assert.equal(ui.status.text, 'Draft');
	assert.deepEqual(Notice.messages, ['Comment saved']);
	ui.unload();
});

void test('成功提示依据提交时的文本，保存期间的输入变化不会改成删除提示', async () => {
	const { ui, storage, file } = await editorHarness();
	await ui.menu(file)();
	const modal = [...ui.modals][0]!;
	modalInput(modal).value = 'Submitted text';
	const paused = pauseCommit(storage);
	const submitting = modalButton(modal, 'Save').click();
	await paused.began;
	modalInput(modal).value = '';
	paused.release();
	await submitting;
	assert.deepEqual(storage.files.get('descript.ion'), utf8('\uFEFFa.md Submitted text\r\n'));
	assert.deepEqual(Notice.messages, ['Comment saved']);
	ui.unload();
});
