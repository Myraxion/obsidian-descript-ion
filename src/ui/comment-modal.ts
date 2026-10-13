import { type App, Modal, Notice, Setting } from 'obsidian';
import { type CommentService, type EditSession } from '../comments/service';
import { t } from '../i18n';

export class CommentModal extends Modal {
	private closed = false;
	private busy = false;
	private blocked = false;
	private input!: HTMLTextAreaElement;
	private message!: HTMLElement;
	private buttons: HTMLButtonElement[] = [];

	constructor(app: App, private readonly service: CommentService, private readonly session: EditSession, private readonly comment: string, private readonly didClose: () => void) {
		super(app);
		this.scope.register(['Mod'], 'Enter', () => { void this.submit(false); return false; });
	}

	onOpen(): void {
		this.setTitle(t('edit_comment'));
		this.contentEl.createEl('p', { text: this.session.path, cls: 'descript-ion-target' });
		this.input = this.contentEl.createEl('textarea', { cls: 'descript-ion-input', attr: { 'aria-label': t('comment_label'), rows: '8' } });
		this.input.value = this.comment;
		this.message = this.contentEl.createEl('p', { cls: 'descript-ion-message', attr: { role: 'status' } });
		this.contentEl.createEl('p', { text: t('modal_shortcut_hint'), cls: 'setting-item-description' });
		new Setting(this.contentEl)
			.addButton(button => {
				button.setButtonText(t('save')).setCta().onClick(() => this.submit(false));
				this.buttons.push(button.buttonEl);
			})
			.addButton(button => {
				button.setButtonText(t('delete_comment')).onClick(() => this.submit(true));
				this.buttons.push(button.buttonEl);
			})
			.addButton(button => button.setButtonText(t('cancel')).onClick(() => this.close()));
		this.input.focus();
	}

	private async submit(remove: boolean): Promise<void> {
		if (this.closed || this.busy || this.blocked) return;
		this.busy = true;
		this.buttons.forEach(button => button.disabled = true);
		const comment = this.input.value;
		const result = remove ? await this.service.delete(this.session) : await this.service.save(this.session, comment);
		if (this.closed) return;
		this.busy = false;
		if (result.status === 'ok') {
			new Notice(remove || !comment.trim() ? t('notice_deleted') : t('notice_saved'));
			this.close();
		} else {
			this.message.setText(t(result.code));
			this.blocked = result.status === 'stale' || result.status === 'readonly';
			if (!this.blocked) this.buttons.forEach(button => button.disabled = false);
		}
	}

	onClose(): void {
		if (this.closed) return;
		this.closed = true;
		this.contentEl.empty();
		this.didClose();
	}
}
