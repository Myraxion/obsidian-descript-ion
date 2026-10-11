import { type FileSystemAdapter, type Plugin, type TAbstractFile } from 'obsidian';
import { rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { platform } from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { type CommentStorage, type TargetState } from './service';

const execFileAsync = promisify(execFile);

async function setHiddenAttribute(filePath: string): Promise<void> {
	try {
		await execFileAsync('attrib.exe', ['+h', filePath]);
	} catch {
		// Non-fatal if setting attributes fails.
	}
}

export class VaultCommentStorage implements CommentStorage {
	private readonly revisions = new WeakMap<TAbstractFile, number>();
	private revision = 0;

	constructor(private readonly plugin: Plugin) {
		const vault = plugin.app.vault;
		plugin.registerEvent(vault.on('rename', file => this.invalidate(file)));
		plugin.registerEvent(vault.on('delete', file => this.invalidate(file)));
	}

	private invalidate(file: TAbstractFile): void {
		this.revisions.set(file, ++this.revision);
	}

	async target(path: string): Promise<TargetState | null> {
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!file || !await this.plugin.app.vault.adapter.exists(path) || file.path !== path) return null;
		let revision = 0;
		// Ancestor moves invalidate descendants without scanning previously viewed objects.
		for (let target: TAbstractFile | null = file; target; target = target.parent) {
			revision = Math.max(revision, this.revisions.get(target) ?? 0);
		}
		return { identity: file, revision };
	}

	async read(path: string): Promise<Uint8Array | null> {
		const adapter = this.plugin.app.vault.adapter;
		return await adapter.exists(path) ? new Uint8Array(await adapter.readBinary(path)) : null;
	}

	async write(path: string, bytes: Uint8Array, beforeCommit?: () => void | Promise<void>): Promise<void> {
		const adapter = this.plugin.app.vault.adapter;
		const filesystem = adapter as FileSystemAdapter;
		const parent = path.slice(0, path.lastIndexOf('/') + 1);
		const parentPath = parent.slice(0, -1);
		const parentFile = parent ? this.plugin.app.vault.getAbstractFileByPath(parentPath) : null;
		const directory = parentFile?.path === parentPath ? parentFile : null;
		const name = path.slice(parent.length);
		const temporaryName = `.descript-ion-${randomUUID()}.tmp`;
		const temporary = parent + temporaryName;
		const fullPath = filesystem.getFullPath(path);
		const temporaryPath = filesystem.getFullPath(temporary);
		// The parent object follows directory moves even while staging is awaiting I/O.
		const locatedPath = (name: string) => filesystem.getFullPath(directory ? `${directory.path}/${name}` : parent + name);
		let restoreHidden = false;
		try {
			// Stage all bytes beside the destination; failed writes never touch the original.
			await adapter.writeBinary(temporary, bytes.slice().buffer);
			await beforeCommit?.();
			if (platform === 'win32' && await adapter.exists(path)) {
				// Windows also rejects replacing a hidden destination. Leave +R untouched.
				restoreHidden = true;
				await execFileAsync('attrib.exe', ['-h', fullPath]);
			}
			await beforeCommit?.();
			await rename(temporaryPath, fullPath);
			restoreHidden = platform === 'win32';
		} finally {
			if (restoreHidden) await setHiddenAttribute(locatedPath(name));
			await unlink(locatedPath(temporaryName)).catch(() => {});
		}
	}

	async remove(path: string): Promise<void> {
		await this.plugin.app.vault.adapter.remove(path);
	}
}
