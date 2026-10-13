import { type Plugin, type TAbstractFile, Notice } from 'obsidian';
import { type CommentService } from '../comments/service';
import { t } from '../i18n';
import { CommentModal } from './comment-modal';

type OpenResult = Awaited<ReturnType<CommentService['open']>>;

interface ActiveEditorFeedback {
	onRead?: (result: OpenResult) => void;
	onClose?: () => void;
}

/** Owns editor requests and modals independently of status-bar display requests. */
export class CommentEditor {
	private active = true;
	private activeRequestId = 0;
	private readonly modals = new Set<CommentModal>();

	constructor(private readonly plugin: Plugin, private readonly comments: CommentService) {
		plugin.register(() => {
			this.active = false;
			for (const modal of this.modals) modal.close();
			this.modals.clear();
		});
	}

	openTarget(file: TAbstractFile): Promise<void> {
		return this.open(file, () => true);
	}

	openActive(file: TAbstractFile, feedback: ActiveEditorFeedback = {}): Promise<void> {
		const requestId = ++this.activeRequestId;
		return this.open(file, () => requestId === this.activeRequestId && this.plugin.app.workspace.getActiveFile() === file, feedback);
	}

	private async open(file: TAbstractFile, isCurrent: () => boolean, feedback: ActiveEditorFeedback = {}): Promise<void> {
		if (!this.active) return;
		const path = file.path;
		const opened = await this.comments.open(path);
		if (!this.active || !isCurrent()) return;
		if (file.path !== path || this.plugin.app.vault.getAbstractFileByPath(path) !== file) return;

		feedback.onRead?.(opened);
		if (opened.status !== 'ok') {
			new Notice(t(opened.code));
			return;
		}
		const modal = new CommentModal(this.plugin.app, this.comments, opened.session, opened.comment, () => {
			this.modals.delete(modal);
			if (this.active) feedback.onClose?.();
		});
		this.modals.add(modal);
		modal.open();
	}
}
