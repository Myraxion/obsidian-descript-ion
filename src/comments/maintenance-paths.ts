import { type PathSplit } from './service';

export class MaintenancePathChanged extends Error {}

export class MaintenanceTask {
	started = false;
	invalidated = false;
	constructor(readonly locations: PathSplit[]) {}

	readonly check = (): void => {
		if (this.invalidated) throw new MaintenancePathChanged();
	};
}

/** Only outstanding maintenance holds paths; ordinary reads retain no targets. */
export class MaintenancePaths {
	private readonly tasks = new Set<MaintenanceTask>();

	track(locations: PathSplit[]): MaintenanceTask {
		const task = new MaintenanceTask(locations);
		this.tasks.add(task);
		return task;
	}

	release(task: MaintenanceTask): void {
		this.tasks.delete(task);
	}

	relocateDirectory(oldPath: string, newPath: string): void {
		for (const task of this.tasks) {
			for (const location of task.locations) {
				if (!location.descriptionPath.startsWith(oldPath + '/')) continue;
				if (task.started) task.invalidated = true;
				else {
					location.parentPath = newPath + location.parentPath.slice(oldPath.length);
					location.descriptionPath = newPath + location.descriptionPath.slice(oldPath.length);
				}
			}
		}
	}

	removeDirectory(path: string): void {
		for (const task of this.tasks) {
			if (task.locations.some(location => location.descriptionPath.startsWith(path + '/'))) {
				task.invalidated = true;
			}
		}
	}

	changeDescription(path: string): void {
		for (const task of this.tasks) {
			if (task.locations.some(location => location.descriptionPath === path)) task.invalidated = true;
		}
	}
}
