import { type Plugin, Notice, TFolder } from 'obsidian';
import { type CommentService, type Failure, splitPath } from './service';
import { t } from '../i18n';

function isDescriptionFile(path: string): boolean {
	return splitPath(path).name.toLowerCase() === 'descript.ion';
}

function notifyResult(result: { status: 'ok' } | Failure, onChanged?: () => void): void {
	if (result.status !== 'ok') {
		new Notice(t(result.code));
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
		notifyResult(await service.rename(oldPath, newPath, file instanceof TFolder), onChanged);
	}));

	plugin.registerEvent(vault.on('delete', async file => {
		const path = file.path;
		notifyResult(await service.remove(path, file instanceof TFolder), onChanged);
	}));

	plugin.registerEvent(vault.on('modify', file => {
		if (isDescriptionFile(file.path)) {
			onChanged?.();
		}
	}));
	plugin.registerEvent(vault.on('create', file => {
		if (isDescriptionFile(file.path)) onChanged?.();
	}));
}
