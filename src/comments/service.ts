import { CommentError, type FormatErrorCode, parseDescription, serializeDescription, validName } from './format';
import { MaintenancePathChanged, MaintenancePaths } from './maintenance-paths';

export type ServiceErrorCode =
	| 'target_not_allowed'
	| 'target_not_found'
	| 'storage_io_error'
	| 'conflict_same_dir'
	| 'conflict_cross_dir'
	| 'storage_dest_write_failed'
	| 'storage_src_clean_failed'
	| 'stale_target'
	| 'stale_file'
	| 'lifecycle_changed';

export type CommentErrorCode = FormatErrorCode | ServiceErrorCode;

export interface TargetState {
	identity: object;
	revision: number;
}

/** All paths are relative to the current Vault. null means absent, not unreadable. */
export interface CommentStorage {
	target(path: string): Promise<TargetState | null>;
	read(path: string): Promise<Uint8Array | null>;
	/** Stage bytes safely, then check before replacing the destination. */
	write(path: string, bytes: Uint8Array, beforeCommit?: () => void): Promise<void>;
	remove(path: string): Promise<void>;
}

export interface EditSession {
	readonly path: string;
	readonly descriptionPath: string;
	readonly name: string;
	readonly target: TargetState;
	readonly bytes: Uint8Array | null;
}

export interface Failure {
	status: 'readonly' | 'limit' | 'invalid-target' | 'invalid-input' | 'stale' | 'storage-error' | 'conflict';
	code: CommentErrorCode;
}

export interface PathSplit {
	parentPath: string;
	name: string;
	descriptionPath: string;
}

export function splitPath(path: string): PathSplit {
	const slash = path.lastIndexOf('/');
	const parentPath = slash === -1 ? '' : path.slice(0, slash);
	const name = path.slice(slash + 1);
	const descriptionPath = slash === -1 ? 'descript.ion' : `${parentPath}/descript.ion`;
	return { parentPath, name, descriptionPath };
}

export function isCommentTarget(path: string): boolean {
	const parts = path.split('/');
	return parts.every(validName) && parts[parts.length - 1]?.toLowerCase() !== 'descript.ion';
}

function failure(error: unknown): Failure {
	if (error instanceof MaintenancePathChanged) return { status: 'stale', code: 'lifecycle_changed' };
	if (error instanceof CommentError) return { status: error.status, code: error.code };
	return { status: 'storage-error', code: 'storage_io_error' };
}

function sameBytes(a: Uint8Array | null, b: Uint8Array | null): boolean {
	return a === null || b === null ? a === b : a.length === b.length && a.every((byte, i) => byte === b[i]);
}

export class CommentService {
	private pending: Promise<unknown> = Promise.resolve();
	private readonly maintenancePaths = new MaintenancePaths();
	constructor(private readonly storage: CommentStorage, private readonly onChanged?: () => void) {}

	async open(path: string): Promise<{ status: 'ok'; comment: string; session: EditSession } | Failure> {
		try {
			if (!isCommentTarget(path)) return { status: 'invalid-target', code: 'target_not_allowed' };
			const target = await this.storage.target(path);
			if (!target) return { status: 'invalid-target', code: 'target_not_found' };
			const { name, descriptionPath } = splitPath(path);
			const bytes = await this.storage.read(descriptionPath);
			const entries = parseDescription(bytes);
			return { status: 'ok', comment: entries.get(name) ?? '', session: { path, descriptionPath, name, target: { ...target }, bytes: bytes?.slice() ?? null } };
		} catch (error) {
			return failure(error);
		}
	}

	save(session: EditSession, comment: string): Promise<{ status: 'ok' } | Failure> {
		const operation = this.pending.then(async () => {
			const result = await this.update(session, comment);
			if (result.status === 'ok') this.onChanged?.();
			return result;
		});
		this.pending = operation;
		return operation;
	}

	delete(session: EditSession): Promise<{ status: 'ok' } | Failure> {
		return this.save(session, '');
	}

	rename(oldPath: string, newPath: string, isDirectory = false): Promise<{ status: 'ok' } | Failure> {
		if (isDirectory) this.maintenancePaths.relocateDirectory(oldPath, newPath);
		const oldSplit = splitPath(oldPath);
		const newSplit = splitPath(newPath);
		if (oldSplit.name.toLowerCase() === 'descript.ion') this.maintenancePaths.changeDescription(oldPath);
		if (newSplit.name.toLowerCase() === 'descript.ion') this.maintenancePaths.changeDescription(newPath);
		return this.maintain([oldSplit, newSplit], check => this.executeRename(oldPath, newPath, oldSplit, newSplit, check));
	}

	remove(path: string, isDirectory = false): Promise<{ status: 'ok' } | Failure> {
		if (isDirectory) this.maintenancePaths.removeDirectory(path);
		const split = splitPath(path);
		if (split.name.toLowerCase() === 'descript.ion') this.maintenancePaths.changeDescription(path);
		return this.maintain([split], check => this.executeRemove(path, split, check));
	}

	private maintain(locations: PathSplit[], execute: (check: () => void) => Promise<{ status: 'ok' } | Failure>): Promise<{ status: 'ok' } | Failure> {
		const task = this.maintenancePaths.track(locations);
		const operation = this.pending.then(async () => {
			try {
				task.started = true;
				task.check();
				return await execute(task.check);
			} catch (error) {
				return failure(error);
			} finally {
				this.maintenancePaths.release(task);
			}
		});
		this.pending = operation;
		return operation;
	}

	private async executeRemove(path: string, split: PathSplit, check: () => void): Promise<{ status: 'ok' } | Failure> {
		try {
			if (!isCommentTarget(path)) return { status: 'ok' };
			const bytes = await this.storage.read(split.descriptionPath);
			check();
			if (bytes === null) return { status: 'ok' };
			const entries = parseDescription(bytes);
			if (!entries.has(split.name)) return { status: 'ok' };
			entries.delete(split.name);
			if (entries.size > 0) {
				const output = serializeDescription(entries);
				await this.storage.write(split.descriptionPath, output, check);
			} else {
				await this.storage.remove(split.descriptionPath);
			}
			return { status: 'ok' };
		} catch (error) {
			return failure(error);
		}
	}

	private async executeRename(oldPath: string, newPath: string, oldSplit: PathSplit, newSplit: PathSplit, check: () => void): Promise<{ status: 'ok' } | Failure> {
		try {
			if (!isCommentTarget(oldPath) || !isCommentTarget(newPath)) return { status: 'ok' };
			if (oldPath === newPath) return { status: 'ok' };
			if (oldSplit.parentPath === newSplit.parentPath) {
				return await this.executeSameDirectoryRename(oldSplit, newSplit, check);
			}
			return await this.executeCrossDirectoryMove(oldSplit, newSplit, check);
		} catch (error) {
			return failure(error);
		}
	}

	private async executeSameDirectoryRename(oldSplit: PathSplit, newSplit: PathSplit, check: () => void): Promise<{ status: 'ok' } | Failure> {
		if (oldSplit.name === newSplit.name) return { status: 'ok' };
		const bytes = await this.storage.read(oldSplit.descriptionPath);
		check();
		if (bytes === null) return { status: 'ok' };
		const entries = parseDescription(bytes);
		if (!entries.has(oldSplit.name)) return { status: 'ok' };
		if (entries.has(newSplit.name)) {
			return { status: 'conflict', code: 'conflict_same_dir' };
		}
		const comment = entries.get(oldSplit.name)!;
		entries.delete(oldSplit.name);
		entries.set(newSplit.name, comment);
		const output = serializeDescription(entries);
		await this.storage.write(oldSplit.descriptionPath, output, check);
		return { status: 'ok' };
	}

	private async executeCrossDirectoryMove(oldSplit: PathSplit, newSplit: PathSplit, check: () => void): Promise<{ status: 'ok' } | Failure> {
		const oldBytes = await this.storage.read(oldSplit.descriptionPath);
		check();
		if (oldBytes === null) return { status: 'ok' };
		const oldEntries = parseDescription(oldBytes);
		if (!oldEntries.has(oldSplit.name)) return { status: 'ok' };

		const comment = oldEntries.get(oldSplit.name)!;
		const newBytes = await this.storage.read(newSplit.descriptionPath);
		check();
		const newEntries = parseDescription(newBytes);
		if (newEntries.has(newSplit.name)) {
			return { status: 'conflict', code: 'conflict_cross_dir' };
		}

		newEntries.set(newSplit.name, comment);
		const newOutput = serializeDescription(newEntries);

		try {
			await this.storage.write(newSplit.descriptionPath, newOutput, check);
		} catch (error) {
			if (error instanceof MaintenancePathChanged) throw error;
			return { status: 'storage-error', code: 'storage_dest_write_failed' };
		}

		check();
		oldEntries.delete(oldSplit.name);
		try {
			if (oldEntries.size > 0) {
				const oldOutput = serializeDescription(oldEntries);
				await this.storage.write(oldSplit.descriptionPath, oldOutput, check);
			} else {
				await this.storage.remove(oldSplit.descriptionPath);
			}
		} catch (error) {
			if (error instanceof MaintenancePathChanged) throw error;
			return { status: 'storage-error', code: 'storage_src_clean_failed' };
		}

		return { status: 'ok' };
	}

	private async update(session: EditSession, comment: string): Promise<{ status: 'ok' } | Failure> {
		try {
			const target = await this.storage.target(session.path);
			if (!target || target.identity !== session.target.identity || target.revision !== session.target.revision) {
				return { status: 'stale', code: 'stale_target' };
			}
			const bytes = await this.storage.read(session.descriptionPath);
			const entries = parseDescription(bytes);
			if (!sameBytes(bytes, session.bytes)) {
				return { status: 'stale', code: 'stale_file' };
			}
			if (comment.trim()) entries.set(session.name, comment);
			else entries.delete(session.name);
			const output = entries.size ? serializeDescription(entries) : null;
			// Recheck after asynchronous reads, immediately before the mutation.
			const current = await this.storage.target(session.path);
			if (!current || current.identity !== target.identity || current.revision !== target.revision) {
				return { status: 'stale', code: 'stale_target' };
			}
			if (output) await this.storage.write(session.descriptionPath, output);
			else if (bytes !== null) await this.storage.remove(session.descriptionPath);
			return { status: 'ok' };
		} catch (error) {
			return failure(error);
		}
	}
}
