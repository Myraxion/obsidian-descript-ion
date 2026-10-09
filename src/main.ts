import { Plugin } from 'obsidian';
import { CommentService } from './comments/service';
import { VaultCommentStorage } from './comments/vault-storage';
import { registerCommentMenu } from './ui/context-menu';
import { registerFileTreeTooltip } from './ui/file-tree-tooltip';

export default class DescriptIonPlugin extends Plugin {
	onload(): void {
		const service = new CommentService(new VaultCommentStorage(this));
		registerCommentMenu(this, service);
		registerFileTreeTooltip(this, service);
	}
}
