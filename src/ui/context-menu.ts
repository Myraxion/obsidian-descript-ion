import { type Plugin, Notice } from 'obsidian';
import { type CommentService, isCommentTarget } from '../comments/service';
import { CommentModal } from './comment-modal';

export function registerCommentMenu(plugin: Plugin, service: CommentService): void {
	const modals = new Set<CommentModal>();
	let active = true;
	plugin.register(() => {
		active = false;
		for (const modal of modals) modal.close();
		modals.clear();
	});
	plugin.registerEvent(plugin.app.workspace.on('file-menu', (menu, file) => {
		if (!isCommentTarget(file.path)) return;
		menu.addItem(item => item.setTitle('编辑备注').setIcon('message-square').onClick(async () => {
			const opened = await service.open(file.path);
			if (!active) return;
			if (opened.status !== 'ok') {
				new Notice(opened.message);
				return;
			}
			const modal = new CommentModal(plugin.app, service, opened.session, opened.comment, () => modals.delete(modal));
			modals.add(modal);
			modal.open();
		}));
	}));
}
