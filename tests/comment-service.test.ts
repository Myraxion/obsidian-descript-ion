import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { type Plugin } from 'obsidian';
import { CommentService, type CommentStorage } from '../src/comments/service';
import { VaultCommentStorage } from '../src/comments/vault-storage';

void test('Windows 隐藏的 TC 备注文件可保存较短备注，保留隐藏属性且无旧内容尾部', { skip: process.platform !== 'win32' }, async () => {
	const directory = await mkdtemp(join(tmpdir(), 'descript-ion-hidden-'));
	const path = join(directory, 'descript.ion');
	try {
		await writeFile(path, '\uFEFFa.md Total Commander 原有较长备注\r\n');
		execFileSync('attrib.exe', ['+H', path]);
		const target = { path: 'a.md' };
		const adapter = {
			exists: async (relative: string) => relative === 'a.md' || relative === 'descript.ion',
			readBinary: async () => {
				const bytes = await readFile(path);
				return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
			},
			writeBinary: async (relative: string, bytes: ArrayBuffer) => writeFile(join(directory, relative), new Uint8Array(bytes)),
			getFullPath: (relative: string) => join(directory, relative),
		};
		const plugin = {
			app: { vault: { adapter, getAbstractFileByPath: () => target, on: () => ({}) } },
			registerEvent: () => {},
			register: () => {},
		} as unknown as Plugin;
		const service = new CommentService(new VaultCommentStorage(plugin));
		const session = (await open(service)).session;
		const result = await service.save(session, '新备注');
		assert.equal(result.status, 'ok', JSON.stringify(result));
		assert.deepEqual(new Uint8Array(await readFile(path)), utf8('\uFEFFa.md 新备注\r\n'));
		assert.equal((await open(service)).comment, '新备注');
		assert.match(execFileSync('attrib.exe', [path], { encoding: 'utf8' }), /H\s/);
		execFileSync('attrib.exe', ['+H', '+R', path]);
		assert.equal((await service.save((await open(service)).session, '不能写入')).status, 'storage-error');
		assert.deepEqual(new Uint8Array(await readFile(path)), utf8('\uFEFFa.md 新备注\r\n'));
	} finally {
		execFileSync('attrib.exe', ['+H', '-R', path]);
		await unlink(path);
		await rmdir(directory);
	}
});

class MemoryStorage implements CommentStorage {
	files = new Map<string, Uint8Array>();
	targets = new Map<string, { identity: object; revision: number }>();
	constructor(path = '中文 笔记.md') {
		this.targets.set(path, { identity: {}, revision: 0 });
	}
	async target(path: string) { return this.targets.get(path) ?? null; }
	async read(path: string) { return this.files.get(path)?.slice() ?? null; }
	async write(path: string, bytes: Uint8Array) { this.files.set(path, bytes.slice()); }
	async remove(path: string) { this.files.delete(path); }
}

async function open(service: CommentService, path = 'a.md') {
	const result = await service.open(path);
	if (result.status !== 'ok') throw new Error(result.message);
	return result;
}

const utf8 = (text: string) => new TextEncoder().encode(text);

void test('悬浮读取父目录备注：外部替换、删除及无法理解的内容在下次打开时生效且不写入', async () => {
	const storage = new MemoryStorage('目录/附件.png');
	storage.targets.set('目录/子目录', { identity: {}, revision: 0 });
	const service = new CommentService(storage);
	const original = utf8('附件.png 中文\\n**粗体** <b>字面文本</b>\x04\u00C2\r\n子目录 文件夹备注\r\n');
	storage.files.set('目录/descript.ion', original);
	assert.equal((await open(service, '目录/附件.png')).comment, '中文\n**粗体** <b>字面文本</b>');
	assert.equal((await open(service, '目录/子目录')).comment, '文件夹备注');
	assert.deepEqual(storage.files.get('目录/descript.ion'), original);
	const changed = utf8('附件.png TC 外部更新\r\n');
	storage.files.set('目录/descript.ion', changed);
	assert.equal((await open(service, '目录/附件.png')).comment, 'TC 外部更新');
	assert.equal((await open(service, '目录/子目录')).comment, '');
	assert.deepEqual(storage.files.get('目录/descript.ion'), changed);
	const unknown = utf8('附件.png 不应显示\x04X\r\n');
	storage.files.set('目录/descript.ion', unknown);
	const result = await service.open('目录/附件.png');
	assert.equal(result.status, 'readonly');
	assert.ok('message' in result && result.message.length > 0);
	assert.deepEqual(storage.files.get('目录/descript.ion'), unknown);
	storage.files.delete('目录/descript.ion');
	assert.equal((await open(service, '目录/附件.png')).comment, '');
	assert.equal(storage.files.has('目录/descript.ion'), false);
});

void test('合法 Unicode 行分隔符在备注中保真往返', async () => {
	const storage = new MemoryStorage('a.md');
	const service = new CommentService(storage);
	const comment = '第一段\u2028第二段\u2029第三段';
	assert.equal((await service.save((await open(service)).session, comment)).status, 'ok');
	assert.equal((await open(service)).comment, comment);
});

for (const content of ['', '\uFEFF', '\r\n\n\r']) {
	void test('已有空备注文件中删除空条目会移除文件', async () => {
		const storage = new MemoryStorage('a.md');
		storage.files.set('descript.ion', utf8(content));
		const service = new CommentService(storage);
		assert.equal((await service.delete((await open(service)).session)).status, 'ok');
		assert.equal(storage.files.has('descript.ion'), false);
	});
}

void test('无效输入可修正后使用同一草稿会话重试，合法 Unicode 与换行保持可读', async () => {
	const storage = new MemoryStorage('a.md');
	const service = new CommentService(storage);
	const session = (await open(service)).session;
	assert.equal((await service.save(session, '文字\x04X')).status, 'invalid-input');
	assert.equal((await service.save(session, '\uD800')).status, 'invalid-input');
	assert.equal(storage.files.has('descript.ion'), false);
	assert.equal((await service.save(session, '说明😀\r\n下一行\r末行')).status, 'ok');
	assert.equal((await open(service)).comment, '说明😀\n下一行\n末行');
});

for (const bom of ['', '\uFEFF']) {
	for (const separator of ['\r', '\n', '\r\n']) {
		void test(`读取 UTF-8 ${bom ? '带' : '不带'} BOM 和 ${JSON.stringify(separator)}，未标记反斜杠保持字面含义`, async () => {
			const storage = new MemoryStorage('a.md');
			storage.files.set('descript.ion', utf8(`${bom}a.md literal\\n\\path${separator}other.md 另一条${separator}`));
			const service = new CommentService(storage);
			const opened = await open(service);
			assert.equal(opened.comment, 'literal\\n\\path');
			assert.equal((await service.save(opened.session, '新备注')).status, 'ok');
			assert.deepEqual(storage.files.get('descript.ion'), utf8('\uFEFFa.md 新备注\r\nother.md 另一条\r\n'));
		});
	}
}

void test('文件夹备注写在父目录，不修改文件夹内部备注文件', async () => {
	const storage = new MemoryStorage('父目录/子目录');
	storage.files.set('父目录/子目录/descript.ion', utf8('a.md 内部\n'));
	const service = new CommentService(storage);
	assert.equal((await service.save((await open(service, '父目录/子目录')).session, '目录备注')).status, 'ok');
	assert.deepEqual(storage.files.get('父目录/descript.ion'), utf8('\uFEFF子目录 目录备注\r\n'));
	assert.deepEqual(storage.files.get('父目录/子目录/descript.ion'), utf8('a.md 内部\n'));
});

void test('非空输入保留空格与换行，更新、删除与最后一条删除', async () => {
	const storage = new MemoryStorage('a.md');
	storage.targets.set('b.md', { identity: {}, revision: 0 });
	const service = new CommentService(storage);
	assert.equal((await service.save((await open(service)).session, ' 说明 \n ')).status, 'ok');
	assert.equal((await open(service)).comment, ' 说明 \n ');
	assert.equal((await service.save((await open(service, 'b.md')).session, '第二条')).status, 'ok');
	assert.equal((await service.delete((await open(service)).session)).status, 'ok');
	assert.deepEqual(storage.files.get('descript.ion'), utf8('\uFEFFb.md 第二条\r\n'));
	assert.equal((await service.save((await open(service, 'b.md')).session, ' \t\n ')).status, 'ok');
	assert.equal(storage.files.has('descript.ion'), false);
});

for (const [label, bytes] of [
	['非 UTF-8', new Uint8Array([0xff, 0xfe, 0x61, 0])],
	['未知程序标记', utf8('a.md 说明\x04X\r\n')],
	['重复名称', utf8('a.md 一\na.md 二\n')],
	['异常记录', utf8('a.md 说明\n无法解析\n')],
	['异常引号', utf8('"a.md 说明\n')],
	['异常转义', utf8('a.md \\x\x04\u00C2\n')],
	['控制字符', utf8('a.md \x00说明\n')],
] as const) {
	void test(`${label}保护整个文件：打开及保存、删除都不改变字节`, async () => {
		const storage = new MemoryStorage('a.md');
		const service = new CommentService(storage);
		const session = (await open(service)).session;
		storage.files.set('descript.ion', bytes);
		assert.equal((await service.open('a.md')).status, 'readonly');
		assert.equal((await service.save(session, '替换')).status, 'readonly');
		assert.equal((await service.delete(session)).status, 'readonly');
		assert.deepEqual(storage.files.get('descript.ion'), bytes);
	});
}

void test('完整单行记录 4096 字节允许，4097 字节拒绝并保留原文件', async () => {
	const storage = new MemoryStorage('a');
	const service = new CommentService(storage);
	assert.equal((await service.save((await open(service, 'a')).session, 'x'.repeat(4092))).status, 'ok');
	assert.equal(storage.files.get('descript.ion')?.length, 4099);
	const bytes = storage.files.get('descript.ion')!.slice();
	assert.equal((await service.save((await open(service, 'a')).session, 'x'.repeat(4093))).status, 'limit');
	assert.deepEqual(storage.files.get('descript.ion'), bytes);
});

void test('多行字节上限包含 Unicode 名称、引号、转义、标记和 CRLF', async () => {
	const storage = new MemoryStorage('中 a');
	const service = new CommentService(storage);
	const exact = 'x'.repeat(4079) + '\n\\';
	assert.equal((await service.save((await open(service, '中 a')).session, exact)).status, 'ok');
	assert.equal(storage.files.get('descript.ion')?.length, 4099);
	const session = (await open(service, '中 a')).session;
	assert.equal((await service.save(session, exact + 'x')).status, 'limit');
	assert.equal((await open(service, '中 a')).comment, exact);
});

for (const changed of [null, utf8('a.md 外部更新\n'), new Uint8Array()]) {
	void test(`备注文件${changed === null ? '删除' : '修改'}后阻止保存与删除，重新打开读到实际状态`, async () => {
		const storage = new MemoryStorage('a.md');
		storage.files.set('descript.ion', utf8('a.md 原始\n'));
		const service = new CommentService(storage);
		const session = (await open(service)).session;
		if (changed === null) storage.files.delete('descript.ion');
		else storage.files.set('descript.ion', changed);
		assert.equal((await service.save(session, '草稿')).status, 'stale');
		assert.equal((await service.delete(session)).status, 'stale');
		assert.deepEqual(storage.files.get('descript.ion') ?? null, changed);
		assert.equal((await open(service)).comment, changed?.length ? '外部更新' : '');
	});
}

void test('打开时不存在的备注文件在保存前创建，阻止覆盖', async () => {
	const storage = new MemoryStorage('a.md');
	const service = new CommentService(storage);
	const session = (await open(service)).session;
	storage.files.set('descript.ion', utf8('b.md 外部新增\n'));
	assert.equal((await service.save(session, '草稿')).status, 'stale');
	assert.deepEqual(storage.files.get('descript.ion'), utf8('b.md 外部新增\n'));
});

for (const change of ['move', 'delete', 'replace', 'rename-back']) {
	void test(`目标 ${change} 后保存和删除暂停，原备注保留`, async () => {
		const storage = new MemoryStorage('a.md');
		storage.files.set('descript.ion', utf8('a.md 原备注\n'));
		const service = new CommentService(storage);
		const session = (await open(service)).session;
		if (change === 'replace') storage.targets.set('a.md', { identity: {}, revision: 0 });
		else if (change === 'rename-back') storage.targets.get('a.md')!.revision++;
		else storage.targets.delete('a.md');
		assert.equal((await service.save(session, '草稿')).status, 'stale');
		assert.equal((await service.delete(session)).status, 'stale');
		assert.deepEqual(storage.files.get('descript.ion'), utf8('a.md 原备注\n'));
	});
}

void test('并发打开的两个编辑器不会覆盖彼此的更新', async () => {
	const storage = new MemoryStorage('a.md');
	const service = new CommentService(storage);
	const first = (await open(service)).session;
	const second = (await open(service)).session;
	const results = await Promise.all([service.save(first, '第一份'), service.save(second, '第二份')]);
	assert.deepEqual(results.map(result => result.status), ['ok', 'stale']);
	assert.equal((await open(service)).comment, '第一份');
});

void test('根目录、备注文件、库外路径及不存在目标不接受编辑', async () => {
	const service = new CommentService(new MemoryStorage('a.md'));
	for (const path of ['', '/', '../a.md', 'a/../b', 'descript.ion', 'a/DESCRIPT.ION', '不存在']) {
		assert.equal((await service.open(path)).status, 'invalid-target');
	}
});

void test('存储读写与删除失败返回可重试的公开结果', async () => {
	const storage = new MemoryStorage('a.md');
	const service = new CommentService(storage);
	const session = (await open(service)).session;
	storage.write = async () => { throw new Error('permission'); };
	assert.equal((await service.save(session, '草稿')).status, 'storage-error');
	assert.equal(storage.files.has('descript.ion'), false);
	storage.files.set('descript.ion', utf8('a.md 原备注\n'));
	const existing = (await open(service)).session;
	storage.remove = async () => { throw new Error('permission'); };
	assert.equal((await service.delete(existing)).status, 'storage-error');
	assert.deepEqual(storage.files.get('descript.ion'), utf8('a.md 原备注\n'));
	storage.read = async () => { throw new Error('permission'); };
	assert.equal((await service.open('a.md')).status, 'storage-error');
});

void test('用户保存中文备注后重新打开，写出 BOM、引号名称和 CRLF', async () => {
	const storage = new MemoryStorage();
	const service = new CommentService(storage);
	const opened = await service.open('中文 笔记.md');
	assert.equal(opened.status, 'ok');
	if (opened.status !== 'ok') return;
	assert.equal((await service.save(opened.session, '中文说明')).status, 'ok');
	assert.deepEqual(storage.files.get('descript.ion'), new TextEncoder().encode('\uFEFF"中文 笔记.md" 中文说明\r\n'));
	const reopened = await service.open('中文 笔记.md');
	assert.equal(reopened.status, 'ok');
	if (reopened.status === 'ok') assert.equal(reopened.comment, '中文说明');
});

void test('多行备注保留换行、空格、反斜杠与字面反斜杠-n，包含精确 TC 标记', async () => {
	const storage = new MemoryStorage('附件.png');
	const service = new CommentService(storage);
	const opened = await service.open('附件.png');
	assert.equal(opened.status, 'ok');
	if (opened.status !== 'ok') return;
	const comment = ' 中文 \\路径\\n\n第二行 \\';
	assert.equal((await service.save(opened.session, comment)).status, 'ok');
	assert.deepEqual(storage.files.get('descript.ion'), new TextEncoder().encode('\uFEFF附件.png  中文 \\\\路径\\\\n\\n第二行 \\\\\x04\u00C2\r\n'));
	const reopened = await service.open('附件.png');
	assert.equal(reopened.status, 'ok');
	if (reopened.status === 'ok') assert.equal(reopened.comment, comment);
});

void test('活动文件状态栏工作流：同一服务边界验证无备注、添加保存、TC 外部修改与删除后更新', async () => {
	const storage = new MemoryStorage('活动文件.md');
	const service = new CommentService(storage);

	// 初始无备注：返回 ok 且备注为空，状态栏据此显示“添加备注”
	const initial = await service.open('活动文件.md');
	assert.equal(initial.status, 'ok');
	if (initial.status !== 'ok') return;
	assert.equal(initial.comment, '');

	// 点击状态栏打开弹窗并保存备注
	const saveRes = await service.save(initial.session, '状态栏首次添加的备注\n第二行详情');
	assert.equal(saveRes.status, 'ok');

	// 弹窗关闭后状态栏重新读取实际存储：得到保存后的多行备注
	const afterSave = await service.open('活动文件.md');
	assert.equal(afterSave.status, 'ok');
	if (afterSave.status !== 'ok') return;
	assert.equal(afterSave.comment, '状态栏首次添加的备注\n第二行详情');

	// 模拟外部 Total Commander 修改备注
	storage.files.set('descript.ion', utf8('\uFEFF"活动文件.md" TC 外部修改的最新备注\r\n'));

	// 状态栏交互（悬浮/点击）或活动文件切换重新读取：立即获取 TC 外部修改
	const external = await service.open('活动文件.md');
	assert.equal(external.status, 'ok');
	if (external.status !== 'ok') return;
	assert.equal(external.comment, 'TC 外部修改的最新备注');

	// 点击状态栏打开弹窗并删除备注
	const delRes = await service.delete(external.session);
	assert.equal(delRes.status, 'ok');

	// 弹窗关闭后重新读取：备注清空且备注文件被清理
	const afterDelete = await service.open('活动文件.md');
	assert.equal(afterDelete.status, 'ok');
	if (afterDelete.status !== 'ok') return;
	assert.equal(afterDelete.comment, '');
	assert.equal(storage.files.has('descript.ion'), false);
});

void test('状态栏读取失败时不伪造无备注结果：只读和异常存储准确返回原因', async () => {
	const storage = new MemoryStorage('只读文件.md');
	const service = new CommentService(storage);

	// 非 UTF-8 备注文件保护
	storage.files.set('descript.ion', new Uint8Array([0xff, 0xfe, 0x00, 0x00]));
	const readonlyResult = await service.open('只读文件.md');
	assert.equal(readonlyResult.status, 'readonly');
	assert.match(readonlyResult.message, /不是合法 UTF-8/);

	// 存储异常
	const brokenStorage = new MemoryStorage('损坏.md');
	brokenStorage.read = async () => { throw new Error('EACCES'); };
	const brokenService = new CommentService(brokenStorage);
	const brokenResult = await brokenService.open('损坏.md');
	assert.equal(brokenResult.status, 'storage-error');
	assert.match(brokenResult.message, /无法读写/);
});
