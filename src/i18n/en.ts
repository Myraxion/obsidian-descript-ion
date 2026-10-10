import type { zhCn } from './zh-cn';

export const en: Record<keyof typeof zhCn, string> = {
	// UI
	edit_comment: 'Edit comment',
	add_comment: 'Add comment',
	comment_label: 'Comment',
	modal_shortcut_hint: 'Enter for newline, Ctrl/Cmd+Enter to save, Escape to cancel.',
	save: 'Save',
	delete_comment: 'Delete comment',
	cancel: 'Cancel',
	notice_saved: 'Comment saved',
	notice_deleted: 'Comment deleted',

	// Error / Failure codes
	target_not_allowed: 'Cannot edit comments for Vault root or description files.',
	target_not_found: 'Comment target no longer exists, please reopen.',
	storage_io_error: 'Cannot read or write description file, please check file permissions and try again.',
	conflict_same_dir: 'Target name already has a comment, keeping existing record.',
	conflict_cross_dir: 'Target already has a comment entry with the same name, keeping both source and target records.',
	storage_dest_write_failed: 'Cannot write to target description file, source comment preserved.',
	storage_src_clean_failed: 'Target comment saved, but failed to clean source comment, keeping duplicate record.',
	stale_target: 'Comment target has been moved, renamed, or deleted. Input preserved, please reopen the object.',
	stale_file: 'Description file has changed. Input preserved, please reopen and verify the latest comment.',
	not_utf8: 'Description file is not valid UTF-8 and cannot be modified.',
	corrupt_line: 'Description file contains invalid records and cannot be modified.',
	invalid_name: 'Description file contains invalid names and cannot be modified.',
	duplicate_name: 'Description file contains duplicate names and cannot be modified.',
	unknown_marker: 'Description file contains unknown program markers and cannot be modified.',
	invalid_escape: 'Description file contains invalid multiline escapes and cannot be modified.',
	control_character: 'Description file contains invalid control characters and cannot be modified.',
	unsupported_characters: 'Comment contains unsupported control characters or Unicode characters, please modify your input.',
	record_limit: 'Complete comment record exceeds 4096 bytes, please shorten input and try again.',
};
