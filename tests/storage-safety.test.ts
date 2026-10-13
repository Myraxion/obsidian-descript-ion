import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, open, readFile, readdir, rename, rmdir, unlink, writeFile } from 'node:fs/promises';
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

void test('暂存后目录移动并停止提交，在新目录清理临时文件并恢复原隐藏属性', async () => {
	const directory = await mkdtemp(resolve('.test-build/descript-ion-relocated-'));
	const folder = { path: 'A' };
	const original = '\uFEFFx.md 原备注\r\n';
	const description = () => join(directory, folder.path, 'descript.ion');
	await mkdir(join(directory, 'A'));
	await writeFile(description(), original);
	try {
		if (process.platform === 'win32') execFileSync('attrib.exe', ['+H', description()]);
		const adapter = {
			exists: async (path: string) => access(join(directory, path)).then(() => true, () => false),
			writeBinary: async (path: string, bytes: ArrayBuffer) => writeFile(join(directory, path), new Uint8Array(bytes)),
			getFullPath: (path: string) => join(directory, path),
		};
		const plugin = {
			app: { vault: { adapter, getAbstractFileByPath: (path: string) => path === 'A' ? folder : null, on: () => ({}) } },
			registerEvent: () => {}, register: () => {},
		} as unknown as Plugin;
		const storage = new VaultCommentStorage(plugin);
		await assert.rejects(storage.commit('A/descript.ion', new TextEncoder().encode('x.md 新备注\r\n'), async () => {
			if (process.platform === 'win32' && /H\s/.test(execFileSync('attrib.exe', [description()], { encoding: 'utf8' }))) return;
			await rename(join(directory, 'A'), join(directory, 'Z'));
			folder.path = 'Z';
			throw new Error('directory moved; stop commit');
		}), /directory moved/);
		assert.equal(await readFile(description(), 'utf8'), original);
		assert.deepEqual(await readdir(join(directory, folder.path)), ['descript.ion']);
		if (process.platform === 'win32') assert.match(execFileSync('attrib.exe', [description()], { encoding: 'utf8' }), /H\s/);
	} finally {
		for (const file of await readdir(join(directory, folder.path))) {
			const path = join(directory, folder.path, file);
			if (process.platform === 'win32') execFileSync('attrib.exe', ['-H', path]);
			await unlink(path);
		}
		await rmdir(join(directory, folder.path));
		await rmdir(directory);
	}
});
