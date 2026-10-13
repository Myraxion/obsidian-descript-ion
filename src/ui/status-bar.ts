import { type Plugin } from 'obsidian';
import { type CommentService, type Failure, isCommentTarget } from '../comments/service';
import { t } from '../i18n';
import { type CommentEditor } from './comment-editor';

export function registerStatusBarComment(plugin: Plugin, service: CommentService, editor: CommentEditor): { refresh: () => void } {
	const { workspace } = plugin.app;
	const document = workspace.containerEl.ownerDocument;
	const window = document.defaultView!;
	const statusBarEl = plugin.addStatusBarItem();
	statusBarEl.addClass('descript-ion-status', 'descript-ion-hidden');

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
				statusBarEl.setText(t('add_comment'));
				statusBarEl.removeAttribute('aria-label');
			}
		} else {
			statusBarEl.addClass('descript-ion-status-error');
			const msg = t(result.code);
			statusBarEl.setText(msg);
			statusBarEl.setAttribute('aria-label', msg);
		}
	}

	function hide(): void {
		statusBarEl.addClass('descript-ion-hidden');
		statusBarEl.empty();
		statusBarEl.removeAttribute('aria-label');
	}

	async function update(): Promise<void> {
		if (!active) return;
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
		if (!active) return;
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

		const currentRequestId = ++requestId;
		await editor.openActive(file, {
			onRead: opened => {
				if (currentRequestId === requestId) render(opened);
			},
			onClose: () => { void update(); },
		});
	});

	plugin.registerEvent(workspace.on('file-open', scheduleUpdate));
	plugin.registerEvent(workspace.on('active-leaf-change', scheduleUpdate));

	void update();
	return { refresh: scheduleUpdate };
}
