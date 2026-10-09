import { type App, Modal, Notice, Setting } from 'obsidian';
import { type CommentService, type EditSession } from '../comments/service';

export class CommentModal extends Modal {
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
		this.setTitle('编辑备注');
		this.contentEl.createEl('p', { text: this.session.path, cls: 'descript-ion-target' });
		this.input = this.contentEl.createEl('textarea', { cls: 'descript-ion-input', attr: { 'aria-label': '备注', rows: '8' } });
		this.input.value = this.comment;
		this.message = this.contentEl.createEl('p', { cls: 'descript-ion-message', attr: { role: 'status' } });
		this.contentEl.createEl('p', { text: 'Enter 换行，Ctrl/Cmd+Enter 保存，Escape 取消。', cls: 'setting-item-description' });
		new Setting(this.contentEl)
			.addButton(button => {
				button.setButtonText('保存').setCta().onClick(() => this.submit(false));
				this.buttons.push(button.buttonEl);
			})
			.addButton(button => {
				button.setButtonText('删除备注').onClick(() => this.submit(true));
				this.buttons.push(button.buttonEl);
			})
			.addButton(button => button.setButtonText('取消').onClick(() => this.close()));
		this.input.focus();
	}

	private async submit(remove: boolean): Promise<void> {
		if (this.busy || this.blocked) return;
		this.busy = true;
		this.buttons.forEach(button => button.disabled = true);
		const result = remove ? await this.service.delete(this.session) : await this.service.save(this.session, this.input.value);
		this.busy = false;
		if (result.status === 'ok') {
			new Notice(remove || !this.input.value.trim() ? '备注已删除' : '备注已保存');
			this.close();
		} else {
			this.message.setText(result.message);
			this.blocked = result.status === 'stale' || result.status === 'readonly';
			if (!this.blocked) this.buttons.forEach(button => button.disabled = false);
		}
	}

	onClose(): void {
		this.contentEl.empty();
		this.didClose();
	}
}
