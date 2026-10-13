export interface PathSplit {
	readonly parentPath: string;
	readonly name: string;
	readonly descriptionPath: string;
}

export function splitPath(path: string): PathSplit {
	const slash = path.lastIndexOf('/');
	const parentPath = slash === -1 ? '' : path.slice(0, slash);
	const name = path.slice(slash + 1);
	const descriptionPath = slash === -1 ? 'descript.ion' : `${parentPath}/descript.ion`;
	return { parentPath, name, descriptionPath };
}
