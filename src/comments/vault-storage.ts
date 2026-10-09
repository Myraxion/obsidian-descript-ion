import { type Plugin, type TAbstractFile } from 'obsidian';
import { type CommentStorage, type TargetState } from './service';

export class VaultCommentStorage implements CommentStorage {
	private readonly tracked = new Map<TAbstractFile, number>();

	constructor(private readonly plugin: Plugin) {
		const vault = plugin.app.vault;
		plugin.registerEvent(vault.on('rename', (file, oldPath) => this.invalidate(file, oldPath)));
		plugin.registerEvent(vault.on('delete', file => this.invalidate(file, file.path)));
		plugin.register(() => this.tracked.clear());
	}

	private invalidate(file: TAbstractFile, oldPath: string): void {
		for (const [target, revision] of this.tracked) {
			if (target === file || target.path.startsWith(oldPath + '/') || target.path.startsWith(file.path + '/')) {
				this.tracked.set(target, revision + 1);
			}
		}
	}

	async target(path: string): Promise<TargetState | null> {
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!file || !await this.plugin.app.vault.adapter.exists(path) || file.path !== path) return null;
		if (!this.tracked.has(file)) this.tracked.set(file, 0);
		return { identity: file, revision: this.tracked.get(file)! };
	}

	async read(path: string): Promise<Uint8Array | null> {
		const adapter = this.plugin.app.vault.adapter;
		return await adapter.exists(path) ? new Uint8Array(await adapter.readBinary(path)) : null;
	}

	async write(path: string, bytes: Uint8Array): Promise<void> {
		await this.plugin.app.vault.adapter.writeBinary(path, bytes.slice().buffer);
	}

	async remove(path: string): Promise<void> {
		await this.plugin.app.vault.adapter.remove(path);
	}
}
