import { type Plugin, Notice } from 'obsidian';
import { type CommentService, type Failure, splitPath } from './service';

function isDescriptionFile(path: string): boolean {
	return splitPath(path).name.toLowerCase() === 'descript.ion';
}

function notifyResult(result: { status: 'ok' } | Failure, onChanged?: () => void): void {
	if (result.status !== 'ok') {
		new Notice(result.message);
	}
	onChanged?.();
}

export function registerCommentLifecycle(
	plugin: Plugin,
	service: CommentService,
	onChanged?: () => void,
): void {
	const vault = plugin.app.vault;

	plugin.registerEvent(vault.on('rename', async (file, oldPath) => {
		const newPath = file.path;
		if (isDescriptionFile(oldPath) || isDescriptionFile(newPath)) {
			onChanged?.();
			return;
		}

		notifyResult(await service.rename(oldPath, newPath), onChanged);
	}));

	plugin.registerEvent(vault.on('delete', async file => {
		const path = file.path;
		if (isDescriptionFile(path)) {
			onChanged?.();
			return;
		}

		notifyResult(await service.remove(path), onChanged);
	}));

	plugin.registerEvent(vault.on('modify', file => {
		if (isDescriptionFile(file.path)) {
			onChanged?.();
		}
	}));
}
