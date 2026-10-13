import { type Plugin } from 'obsidian';
import { isCommentTarget } from '../comments/service';
import { t } from '../i18n';
import { type CommentEditor } from './comment-editor';

export function registerCommentMenu(plugin: Plugin, editor: CommentEditor): void {
	plugin.registerEvent(plugin.app.workspace.on('file-menu', (menu, file) => {
		if (!isCommentTarget(file.path)) return;
		menu.addItem(item => item.setTitle(t('edit_comment')).setIcon('message-square').onClick(() => editor.openTarget(file)));
	}));
}
