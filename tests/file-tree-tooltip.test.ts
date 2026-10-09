import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness } from './fixtures/file-tree-harness';

async function settle(): Promise<void> { for (let i = 0; i < 12; i++) await Promise.resolve(); }

void test('备注与官方Tooltip不会重叠', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	const app = harness();
	app.dispatch('pointerover');
	app.dispatch('mouseover');
	await settle();
	context.mock.timers.tick(1200);
	assert.equal(app.tooltips().length, 1, 'native and comment Tooltip must not coexist');
	app.unload();
});

void test('悬浮备注约200ms一次显示统一内容，官方较长延迟后也不会叠加', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	const app = harness();
	const event = app.dispatch('pointerover');
	app.dispatch('mouseover');
	await settle();
	context.mock.timers.tick(199);
	assert.equal(app.tooltips().length, 0, 'must not display before 200ms');
	context.mock.timers.tick(1);
	assert.equal(app.tooltips().length, 1);
	context.mock.timers.tick(1000);
	assert.equal(app.tooltips().length, 1, 'native Tooltip must not overlap');
	assert.deepEqual(app.text(), ['中文\n**备注** <b>文本</b>\n笔记\n\n最后修改于 2026-10-09 12:00\n创建于 2026-10-09 11:00']);
	assert.equal(app.previews(), 1);
	assert.equal(app.previewEvents()[0]?.event, event);
	assert.equal(app.previewEvents()[0]?.source, 'file-explorer');
	assert.equal(app.previewEvents()[0]?.linktext, '笔记.md');
	app.unload();
});

void test('目录统一提示保留完整标题及官方后代数量，不触发文件预览', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	const app = harness('目录备注', true);
	app.dispatch('pointerover');
	await settle();
	context.mock.timers.tick(200);
	assert.deepEqual(app.text(), ['目录备注\n目录\n\n3 个文件, 2 个文件夹']);
	assert.equal(app.previews(), 0);
	app.unload();
});

void test('读取超过原生延迟也不先显示，内容就绪后一次显示', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	const app = harness();
	let finish!: () => void;
	app.delayRead(() => new Promise(resolve => { finish = resolve; }));
	app.dispatch('pointerover');
	await settle();
	context.mock.timers.tick(1500);
	assert.equal(app.tooltips().length, 0);
	finish();
	await settle();
	assert.equal(app.tooltips().length, 1);
	assert.equal(app.nativeCalls(), 0);
	app.unload();
});

void test('无备注读取判定后恢复原官方提示和文件预览', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	const app = harness('');
	app.dispatch('pointerover');
	await settle();
	assert.equal(app.nativeCalls(), 1);
	context.mock.timers.tick(200);
	assert.equal(app.tooltips().length, 0);
	context.mock.timers.tick(800);
	assert.equal(app.tooltips()[0]?.textContent, '原官方提示');
	assert.equal(app.previews(), 1);
	app.unload();
	assert.equal(app.tooltips().length, 0);
});

void test('外部删除备注后下一次悬浮恢复官方行为', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	const app = harness();
	app.dispatch('pointerover');
	await settle();
	context.mock.timers.tick(200);
	assert.equal(app.tooltips().length, 1);
	app.dispatch('pointerout');
	app.setComment('');
	app.dispatch('pointerover');
	await settle();
	context.mock.timers.tick(1000);
	assert.equal(app.tooltips().length, 1);
	assert.equal(app.tooltips()[0]?.textContent, '原官方提示');
	app.unload();
});

void test('不可理解的备注只显示原因和官方信息，没有原备注或第二个提示', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	const app = harness('不应显示\x04X');
	app.dispatch('pointerover');
	await settle();
	context.mock.timers.tick(1200);
	assert.deepEqual(app.text(), ['备注文件含未知程序标记，无法修改。\n笔记\n\n最后修改于 2026-10-09 12:00\n创建于 2026-10-09 11:00']);
	assert.equal(app.tooltips().length, 1);
	app.unload();
});

void test('离开或卸载使未完成读取失效，重新注册不积累行为', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	for (const leave of ['pointerout', 'unload']) {
		const app = harness();
		let finish!: () => void;
		app.delayRead(() => new Promise(resolve => { finish = resolve; }));
		app.dispatch('pointerover');
		await settle();
		if (leave === 'unload') app.unload();
		else app.dispatch('pointerout');
		finish();
		await settle();
		context.mock.timers.tick(1200);
		assert.equal(app.tooltips().length, 0);
		if (leave !== 'unload') app.unload();
	}
	const fresh = harness();
	for (let i = 1; i <= 3; i++) {
		fresh.dispatch('pointerover');
		await settle();
		context.mock.timers.tick(1200);
		assert.equal(fresh.tooltips().length, 1);
		assert.equal(fresh.previews(), i);
		fresh.unload();
		assert.equal(fresh.tooltips().length, 0);
		if (i < 3) fresh.enable();
	}
});

void test('快速离开再进入时旧读取不会替换当前备注', async context => {
	context.mock.timers.enable({ apis: ['setTimeout'] });
	const app = harness('旧备注');
	let finish!: () => void;
	let first = true;
	app.delayRead(() => {
		if (!first) return Promise.resolve();
		first = false;
		return new Promise(resolve => { finish = resolve; });
	});
	app.dispatch('pointerover');
	await settle();
	app.dispatch('pointerout');
	app.setComment('新备注');
	app.dispatch('pointerover');
	await settle();
	context.mock.timers.tick(200);
	const before = app.text();
	assert.match(before[0] ?? '', /^新备注\n/);
	finish();
	await settle();
	context.mock.timers.tick(1000);
	assert.deepEqual(app.text(), before);
	assert.equal(app.tooltips().length, 1);
	app.unload();
});

