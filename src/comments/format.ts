const encoder = new TextEncoder();
const marker = '\x04\u00C2';

export type FormatErrorCode =
	| 'not_utf8'
	| 'corrupt_line'
	| 'invalid_name'
	| 'duplicate_name'
	| 'unknown_marker'
	| 'invalid_escape'
	| 'control_character'
	| 'unsupported_characters'
	| 'record_limit';

export class CommentError extends Error {
	constructor(
		public readonly status: 'readonly' | 'limit' | 'invalid-input',
		public readonly code: FormatErrorCode,
	) {
		super(code);
	}
}

export function parseDescription(bytes: Uint8Array | null): Map<string, string> {
	let text: string;
	try {
		text = bytes ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : '';
	} catch {
		throw new CommentError('readonly', 'not_utf8');
	}
	const entries = new Map<string, string>();
	for (const line of text.split(/\r\n|\r|\n/)) {
		if (!line.trim()) continue;
		const match = /^(?:"([^"\r\n]+)"|([^\s"]+)) (.*)$/s.exec(line);
		if (!match) throw new CommentError('readonly', 'corrupt_line');
		const name = match[1] ?? match[2]!;
		if (!validName(name)) throw new CommentError('readonly', 'invalid_name');
		if (entries.has(name)) throw new CommentError('readonly', 'duplicate_name');
		let comment = match[3]!;
		if (comment.includes('\x04')) {
			if (!comment.endsWith(marker) || comment.indexOf('\x04') !== comment.length - marker.length) {
				throw new CommentError('readonly', 'unknown_marker');
			}
			comment = comment.slice(0, -marker.length);
			if (comment.replace(/\\[\\n]/g, '').includes('\\')) {
				throw new CommentError('readonly', 'invalid_escape');
			}
			comment = comment.replace(/\\([\\n])/g, (_, escaped: string) => escaped === 'n' ? '\n' : '\\');
		}
		// Control characters would make a record ambiguous or unreadable.
		// eslint-disable-next-line no-control-regex -- Reject unsupported record control characters.
		if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(comment)) {
			throw new CommentError('readonly', 'control_character');
		}
		entries.set(name, comment);
	}
	return entries;
}

export function validName(name: string): boolean {
	// eslint-disable-next-line no-control-regex -- Names cannot contain record separators or controls.
	return !!name && name !== '.' && name !== '..' && !/["/\\\x00-\x1F]/.test(name);
}

export function serializeDescription(entries: Map<string, string>): Uint8Array {
	const lines: string[] = [];
	for (const [name, value] of entries) {
		let comment = value.replace(/\r\n|\r/g, '\n');
		// eslint-disable-next-line no-control-regex -- Reject input that cannot be safely serialized.
		if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(comment) || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(comment)) {
			throw new CommentError('invalid-input', 'unsupported_characters');
		}
		if (comment.includes('\n')) {
			comment = comment.replace(/\\/g, '\\\\').replace(/\n/g, '\\n') + marker;
		}
		const record = `${/\s/.test(name) ? `"${name}"` : name} ${comment}\r\n`;
		if (encoder.encode(record).length > 4096) {
			throw new CommentError('limit', 'record_limit');
		}
		lines.push(record);
	}
	return encoder.encode('\uFEFF' + lines.join(''));
}
