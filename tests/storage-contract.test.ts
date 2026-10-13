import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { type Plugin } from 'obsidian';
import { type CommentStorage } from '../src/comments/service';
import { VaultCommentStorage } from '../src/comments/vault-storage';
import { MemoryStorage } from './fixtures/memory-storage';

const path = 'descript.ion';
const original = new TextEncoder().encode('\uFEFFa.md 原备注\r\n');
const replacement = new TextEncoder().encode('\uFEFFa.md 新备注\r\n');

interface Harness {
	storage: CommentStorage;
	close: () => Promise<void>;
}

async function memory(): Promise<Harness> {
	const storage = new MemoryStorage();
	storage.files.set(path, original.slice());
	return { storage, close: async () => {} };
}

async function vault(): Promise<Harness> {
	const directory = await mkdtemp(resolve('.test-build/descript-ion-contract-'));
	await writeFile(join(directory, path), original);
	const adapter = {
		exists: async (relative: string) => access(join(directory, relative)).then(() => true, () => false),
		readBinary: async (relative: string) => {
			const bytes = await readFile(join(directory, relative));
			return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
		},
		writeBinary: async (relative: string, bytes: ArrayBuffer) => writeFile(join(directory, relative), new Uint8Array(bytes)),
		remove: async (relative: string) => unlink(join(directory, relative)),
		getFullPath: (relative: string) => join(directory, relative),
	};
	const plugin = {
		app: { vault: { adapter, getAbstractFileByPath: () => null, on: () => ({}) } },
		registerEvent: () => {},
	} as unknown as Plugin;
	return {
		storage: new VaultCommentStorage(plugin),
		close: async () => {
			for (const name of await readdir(directory)) {
				const fullPath = join(directory, name);
				if (process.platform === 'win32') execFileSync('attrib.exe', ['-H', fullPath]);
				await unlink(fullPath);
			}
			await rmdir(directory);
		},
	};
}

for (const [name, setup] of [['Memory', memory], ['Vault', vault]] as const) {
	for (const bytes of [replacement, null]) {
		const action = bytes === null ? '删除' : '写入';
		void test(`${name} 提交契约：${action}等待异步检查通过后才修改原文件`, async () => {
			const { storage, close } = await setup();
			let release!: () => void;
			let entered!: () => void;
			const gate = new Promise<void>(resolve => { release = resolve; });
			const began = new Promise<void>(resolve => { entered = resolve; });
			const operation = storage.commit(path, bytes, async () => { entered(); await gate; });
			try {
				await began;
				assert.deepEqual(await storage.read(path), original);
				release();
				await operation;
				assert.deepEqual(await storage.read(path), bytes);
			} finally {
				release();
				await operation.catch(() => {});
				await close();
			}
		});

		void test(`${name} 提交契约：${action}检查拒绝时保留原字节并传播原错误`, async () => {
			const { storage, close } = await setup();
			const rejected = new Error('commit no longer allowed');
			try {
				await assert.rejects(storage.commit(path, bytes, async () => { throw rejected; }), error => error === rejected);
				assert.deepEqual(await storage.read(path), original);
			} finally {
				await close();
			}
		});
	}
}
