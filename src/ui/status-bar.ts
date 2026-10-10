import { type Plugin, Notice } from 'obsidian';
import { type CommentService, type Failure, isCommentTarget } from '../comments/service';
import { CommentModal } from './comment-modal';

export function registerStatusBarComment(plugin: Plugin, service: CommentService): { refresh: () => void } {
	const { workspace } = plugin.app;
	const document = workspace.containerEl.ownerDocument;
	const window = document.defaultView!;
	const statusBarEl = plugin.addStatusBarItem();
	statusBarEl.addClass('descript-ion-status', 'descript-ion-hidden');

	const modals = new Set<CommentModal>();
	let active = true;
	let requestId = 0;
	let updateTimer: number | undefined;

	function cancelSchedule(): void {
		if (updateTimer !== undefined) {
			window.clearTimeout(updateTimer);
			updateTimer = undefined;
		}
	}

	plugin.register(() => {
		active = false;
		cancelSchedule();
		for (const modal of modals) modal.close();
		modals.clear();
		statusBarEl.remove();
	});

	function render(result: { status: 'ok'; comment: string } | Failure): void {
		statusBarEl.removeClass('descript-ion-hidden');
		if (result.status === 'ok') {
			statusBarEl.removeClass('descript-ion-status-error');
			if (result.comment) {
				statusBarEl.setText(result.comment);
				statusBarEl.setAttribute('aria-label', result.comment);
			} else {
				statusBarEl.setText('添加备注');
				statusBarEl.removeAttribute('aria-label');
			}
		} else {
			statusBarEl.addClass('descript-ion-status-error');
			statusBarEl.setText(result.message);
			statusBarEl.setAttribute('aria-label', result.message);
		}
	}

	function hide(): void {
		statusBarEl.addClass('descript-ion-hidden');
		statusBarEl.empty();
		statusBarEl.removeAttribute('aria-label');
	}

	async function update(): Promise<void> {
		const file = workspace.getActiveFile();
		if (!file || !isCommentTarget(file.path)) {
			requestId++;
			hide();
			return;
		}

		const currentRequestId = ++requestId;
		const targetPath = file.path;

		const result = await service.open(targetPath);
		if (!active || currentRequestId !== requestId) return;
		if (workspace.getActiveFile()?.path !== targetPath) return;

		render(result);
	}

	function scheduleUpdate(): void {
		cancelSchedule();
		updateTimer = window.setTimeout(() => {
			updateTimer = undefined;
			void update();
		}, 20);
	}

	plugin.registerDomEvent(statusBarEl, 'mouseenter', () => {
		void update();
	});

	plugin.registerDomEvent(statusBarEl, 'click', async () => {
		const file = workspace.getActiveFile();
		if (!file || !isCommentTarget(file.path)) return;

		const targetPath = file.path;
		const currentRequestId = ++requestId;
		const opened = await service.open(targetPath);
		if (!active || currentRequestId !== requestId) return;
		if (workspace.getActiveFile()?.path !== targetPath) return;

		render(opened);
		if (opened.status !== 'ok') {
			new Notice(opened.message);
			return;
		}

		const modal = new CommentModal(plugin.app, service, opened.session, opened.comment, () => {
			modals.delete(modal);
			void update();
		});
		modals.add(modal);
		modal.open();
	});

	plugin.registerEvent(workspace.on('file-open', scheduleUpdate));
	plugin.registerEvent(workspace.on('active-leaf-change', scheduleUpdate));

	void update();
	return { refresh: scheduleUpdate };
}
