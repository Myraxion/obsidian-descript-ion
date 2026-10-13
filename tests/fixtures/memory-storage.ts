import { type CommentStorage, type CommitCheck, type TargetState } from '../../src/comments/service';

export class MemoryStorage implements CommentStorage {
	files = new Map<string, Uint8Array>();
	targets = new Map<string, TargetState>();

	constructor(path?: string) {
		if (path) this.targets.set(path, { identity: {}, revision: 0 });
	}

	async target(path: string): Promise<TargetState | null> {
		return this.targets.get(path) ?? null;
	}

	async read(path: string): Promise<Uint8Array | null> {
		return this.files.get(path)?.slice() ?? null;
	}

	async commit(path: string, bytes: Uint8Array | null, check: CommitCheck): Promise<void> {
		const output = bytes?.slice() ?? null;
		await check();
		if (output === null) this.files.delete(path);
		else this.files.set(path, output);
	}
}
