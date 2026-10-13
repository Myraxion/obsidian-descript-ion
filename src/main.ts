import { Plugin } from 'obsidian';
import { registerCommentLifecycle } from './comments/lifecycle';
import { CommentService } from './comments/service';
import { VaultCommentStorage } from './comments/vault-storage';
import { registerCommentMenu } from './ui/context-menu';
import { CommentEditor } from './ui/comment-editor';
import { registerFileTreeTooltip } from './ui/file-tree-tooltip';
import { registerStatusBarComment } from './ui/status-bar';

export default class DescriptIonPlugin extends Plugin {
	onload(): void {
		const service = new CommentService(new VaultCommentStorage(this), () => statusBar.refresh());
		const editor = new CommentEditor(this, service);
		registerCommentMenu(this, editor);
		registerFileTreeTooltip(this, service);
		const statusBar = registerStatusBarComment(this, service, editor);
		registerCommentLifecycle(this, service, () => statusBar.refresh());
	}
}
