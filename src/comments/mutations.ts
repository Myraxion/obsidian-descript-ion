import { type PathSplit, splitPath } from './paths';

export class MaintenancePathChanged extends Error {}

interface RenameExecution {
	readonly source: PathSplit;
	readonly destination: PathSplit;
	readonly check: () => void;
}

interface RemoveExecution {
	readonly location: PathSplit;
	readonly check: () => void;
}

class MaintenanceTask {
	started = false;
	invalidated = false;
	constructor(public locations: PathSplit[]) {}

	readonly check = (): void => {
		if (this.invalidated) throw new MaintenancePathChanged();
	};
}

/** Owns one modification queue and only outstanding maintenance locations. */
export class CommentMutations<Result> {
	private pending: Promise<unknown> = Promise.resolve();
	private readonly tasks = new Set<MaintenanceTask>();

	constructor(private readonly toFailure: (error: unknown) => Result) {}

	enqueueEdit(execute: () => Promise<Result>): Promise<Result> {
		const operation = this.pending.then(execute);
		this.pending = operation;
		return operation;
	}

	rename(oldPath: string, newPath: string, isDirectory: boolean, execute: (context: RenameExecution) => Promise<Result>): Promise<Result> {
		// Apply the event now, before registering and queuing its own maintenance.
		if (isDirectory) this.relocateDirectory(oldPath, newPath);
		const source = splitPath(oldPath);
		const destination = splitPath(newPath);
		if (source.name.toLowerCase() === 'descript.ion') this.changeDescription(oldPath);
		if (destination.name.toLowerCase() === 'descript.ion') this.changeDescription(newPath);
		return this.maintain([source, destination], (locations, check) => execute({
			source: locations[0]!, destination: locations[1]!, check,
		}));
	}

	remove(path: string, isDirectory: boolean, execute: (context: RemoveExecution) => Promise<Result>): Promise<Result> {
		if (isDirectory) this.removeDirectory(path);
		const location = splitPath(path);
		if (location.name.toLowerCase() === 'descript.ion') this.changeDescription(path);
		return this.maintain([location], (locations, check) => execute({ location: locations[0]!, check }));
	}

	private maintain(locations: PathSplit[], execute: (locations: readonly PathSplit[], check: () => void) => Promise<Result>): Promise<Result> {
		const task = new MaintenanceTask(locations);
		this.tasks.add(task);
		return this.enqueueEdit(async () => {
			try {
				task.started = true;
				task.check();
				// Expose snapshots only when the task starts, after queued directory moves.
				return await execute(task.locations.map(location => ({ ...location })), task.check);
			} catch (error) {
				// Map maintenance failures before settling the queue, as the caller did previously.
				return this.toFailure(error);
			} finally {
				this.tasks.delete(task);
			}
		});
	}

	private relocateDirectory(oldPath: string, newPath: string): void {
		for (const task of this.tasks) {
			task.locations = task.locations.map(location => {
				if (!location.descriptionPath.startsWith(oldPath + '/')) return location;
				if (task.started) {
					task.invalidated = true;
					return location;
				}
				return {
					...location,
					parentPath: newPath + location.parentPath.slice(oldPath.length),
					descriptionPath: newPath + location.descriptionPath.slice(oldPath.length),
				};
			});
		}
	}

	private removeDirectory(path: string): void {
		for (const task of this.tasks) {
			if (task.locations.some(location => location.descriptionPath.startsWith(path + '/'))) {
				task.invalidated = true;
			}
		}
	}

	private changeDescription(path: string): void {
		for (const task of this.tasks) {
			if (task.locations.some(location => location.descriptionPath === path)) task.invalidated = true;
		}
	}
}
