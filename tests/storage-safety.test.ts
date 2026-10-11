import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, open, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { type Plugin } from 'obsidian';
import { CommentService } from '../src/comments/service';
import { VaultCommentStorage } from '../src/comments/vault-storage';

void test('部分写入失败保留原备注文件字节和隐藏属性，清理临时文件', async () => {
	const directory = await mkdtemp(resolve('.test-build/descript-ion-partial-'));
	const path = join(directory, 'descript.ion');
	const original = '\uFEFFa.md 原始备注不能丢失\r\n';
	try {
		await writeFile(path, original);
		if (process.platform === 'win32') execFileSync('attrib.exe', ['+H', path]);
		const target = { path: 'a.md' };
		const adapter = {
			exists: async (relative: string) => relative === 'a.md' || relative === 'descript.ion',
			readBinary: async () => {
				const bytes = await readFile(path);
				return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
			},
			writeBinary: async (relative: string, bytes: ArrayBuffer) => {
				const file = await open(join(directory, relative), relative === 'descript.ion' ? 'r+' : 'w');
				try {
					await file.writeFile(new Uint8Array(bytes).slice(0, 12));
					throw new Error('ENOSPC: injected partial write');
				} finally {
					await file.close();
				}
			},
			getFullPath: (relative: string) => join(directory, relative),
		};
		const plugin = {
			app: { vault: { adapter, getAbstractFileByPath: () => target, on: () => ({}) } },
			registerEvent: () => {}, register: () => {},
		} as unknown as Plugin;
		const service = new CommentService(new VaultCommentStorage(plugin));
		const opened = await service.open('a.md');
		assert.equal(opened.status, 'ok');
		if (opened.status !== 'ok') return;
		assert.equal((await service.save(opened.session, '替换内容')).status, 'storage-error');
		assert.equal(await readFile(path, 'utf8'), original);
		assert.deepEqual(await readdir(directory), ['descript.ion']);
		if (process.platform === 'win32') {
			assert.match(execFileSync('attrib.exe', [path], { encoding: 'utf8' }), /H\s/);
		}
	} finally {
		if (process.platform === 'win32') execFileSync('attrib.exe', ['-H', path]);
		for (const file of await readdir(directory)) await unlink(join(directory, file));
		await rmdir(directory);
	}
});
