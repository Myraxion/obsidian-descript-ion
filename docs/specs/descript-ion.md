# Descript.ion comments: desktop UTF-8 comment management

Status as of 2026-10-10: context-menu editing (#2), file explorer comment tooltips (#3), active-file comment status bar (#4), same-directory rename/delete maintenance (#5), and cross-directory move maintenance (#6) are implemented and accepted. Orphan comment cleanup (#7, #8) was confirmed out of scope / cancelled (wontfix) per user requirement. All required first-release features are now completed and accepted; see the [task index](../design/descript-ion-tickets.md). File explorer tooltip behavior reflects the user's later confirmed [position and size decisions](../design/file-tree-tooltip-position.md).

## Problem Statement

Obsidian users who maintain file and folder comments in Total Commander cannot conveniently view or edit those comments inside Obsidian. Moving, renaming, or deleting a note, attachment, or folder can leave its descript.ion comment entry stale or orphaned. Manually editing these files also risks breaking encoding, TC multiline escapes, or another program's fields.

Users need local, predictable comment management inside the Vault, with explicit failures and compatibility with TC's UTF-8 format.

## Solution

Build a desktop Obsidian plugin named **Descript.ion comments**, with plugin ID `descript-ion` and Simplified Chinese UI. Support comments on Vault files and folders through file explorer tooltips, context-menu editing, a plain-text multiline modal, and an active-file status bar item.

Maintain comment entries when objects are moved, renamed, or deleted inside Obsidian. Delete a description file when no comments or unrecognized content remain. Treat description files that cannot be completely understood as read-only rather than risking destructive rewrites.

## User Stories

1. As an Obsidian desktop user, I want to comment on a note, so that its purpose is visible without changing its contents.
2. As an Obsidian desktop user, I want to comment on an attachment, so that supporting files have useful descriptions too.
3. As an Obsidian desktop user, I want to comment on a folder using its parent's description file, so that its comment follows the same directory-based convention as TC.
4. As a Vault owner, I want comment management confined to my current Vault, so that unrelated files are not accessed or modified.
5. As an Obsidian desktop user, I want to hover over a file explorer object and see its comment, so that I can understand it without opening an editor.
6. As an Obsidian desktop user, I want multiline comments to remain readable in a bounded file explorer tooltip, with overflow clipped and the full comment available through the editor.
7. As an Obsidian desktop user, I want to add or modify a comment from a file or folder context menu, so that editing is available beside the object.
8. As an Obsidian desktop user, I want a plain-text multiline input with save, delete-comment, and cancel actions, so that I can explicitly manage a comment.
9. As a keyboard user, I want Enter to insert a newline, Ctrl/Cmd+Enter to save, and Escape to cancel, so that editing behaves predictably.
10. As an Obsidian desktop user, I want markup in comments displayed as literal text, so that Markdown or HTML does not change what I wrote.
11. As an Obsidian desktop user, I want the status bar to show the active file's comment, so that the description is available while I work.
12. As an Obsidian desktop user, I want long status-bar comments shortened visually and available in full on hover, so that they remain useful without occupying excessive space.
13. As an Obsidian desktop user, I want to click the status bar to edit the active file's comment, so that I can update it quickly.
14. As an Obsidian desktop user, I want an active file without a comment to show “添加备注”, so that I can discover the edit action.
15. As an Obsidian desktop user, I want the comment status item hidden when no file is active, so that actions do not target an ambiguous object.
16. As a TC user, I want valid UTF-8 description files accepted with or without a BOM, so that existing compatible comments can be used.
17. As a TC user, I want CR, LF, and CRLF input line endings accepted, so that compatible files from different editors remain readable.
18. As a TC user, I want names containing spaces encoded with quotes, so that each comment is associated with the correct object.
19. As a TC user, I want Chinese and other Unicode text preserved, so that names and descriptions are not corrupted.
20. As a TC user, I want multiline comments encoded with TC's program marker and escaping, so that TC and the plugin display the same text.
21. As a TC user, I want literal backslashes and literal backslash-n text to round-trip correctly, so that ordinary text is not mistaken for a newline.
22. As a TC user, I want unmarked single-line comments left unescaped when displayed, so that only TC-marked records receive TC multiline decoding.
23. As a TC user, I want successful writes standardized to a UTF-8 BOM and CRLF without an added leading blank line, so that output is consistent.
24. As an Obsidian desktop user, I want oversized serialized records rejected while my input remains available, so that I can shorten a comment without losing it.
25. As an Obsidian desktop user, I want a rename that would make a record oversized to report comment synchronization failure and retain the existing record, so that my comment is not silently lost.
26. As a Vault owner, I want non-UTF-8 files and unknown program markers to prevent mutation, so that unsupported information is preserved.
27. As a Vault owner, I want duplicate names and malformed records to make the entire description file read-only, so that an ambiguous file is not partially rewritten.
28. As a Vault owner, I want edit and lifecycle maintenance to respect the same read-only rule, so that every entry point protects the original bytes.
29. As an Obsidian desktop user, I want empty or whitespace-only input to delete a comment, so that clearing the input removes the record.
30. As an Obsidian desktop user, I want meaningful comments to retain their spaces and newlines, so that their formatting remains mine.
31. As a TC user, I want removal of the last comment to delete its description file, so that empty metadata files do not accumulate.
32. As an Obsidian desktop user, I want file renames within a directory to update the associated name, so that the comment still belongs to the file.
33. As an Obsidian desktop user, I want folder renames to update the folder's comment in its parent directory, so that folder descriptions remain associated correctly.
34. As an Obsidian desktop user, I want moving a file between directories to transfer its comment, so that the description follows it.
35. As an Obsidian desktop user, I want a moved folder's internal description files to keep their relative entries while its own parent entry is maintained, so that descendants are not incorrectly rewritten.
36. As an Obsidian desktop user, I want deletion of a file or folder to remove its corresponding parent comment entry, so that ordinary deletion does not leave an orphan comment.
37. As a Vault owner, I want an existing destination entry to stop synchronization and preserve both records, so that moving an object does not silently overwrite another comment.
38. As a Vault owner, I want a destination-write failure to retain the source comment and report the failure, so that failed synchronization preserves the text.
39. As a Vault owner, I want a source-removal failure after destination success to retain duplicate records and report the failure, so that recovery does not lose the comment or undo the object move.
40. As an Obsidian desktop user, I want saving paused if the description file changed after opening the modal, so that I do not overwrite an external edit and can keep my draft.
41. As an Obsidian desktop user, I want saving paused if the modal's target moved, was renamed, or was deleted, so that my draft is not written to a stale or incorrect target.
42. As a TC user, I want the next tooltip, modal, status-bar interaction, or active-file change to read current stored comments, so that external edits become visible during normal use.
43. As a Vault owner, I want descript.ion itself excluded from comment targets and direct operations on it to refresh the view without reconstructing its records, so that metadata does not recursively manage itself.
44. As an Obsidian desktop user, I want the plugin to remove its listeners and UI when disabled, so that reloading does not leave duplicated behavior.
45. As a TC user, I want actual Obsidian and TC bidirectional compatibility verified, so that passing synthetic tests is not mistaken for working application interoperability.

## Implementation Decisions

- Use the project glossary terms: comment target, comment, description file, comment entry, orphan comment, and current directory. The current directory is the active file's parent directory.
- Support Vault files, including notes and attachments, and folders. Store each target's comment under its basename in its parent's descript.ion. The Vault root and descript.ion itself are not comment targets.
- Set the plugin identity to `descript-ion` / `Descript.ion comments` and declare it desktop-only. Use Simplified Chinese UI; keep command IDs stable after release. Determine the minimum Obsidian version from the public APIs actually used.
- Keep plugin lifecycle and registration small. Separate responsibilities for byte-format handling, comment operations and storage, lifecycle event integration, and UI. These are internal responsibilities, not multiple required public testing interfaces.
- Introduce a high-level comment service boundary for reading, saving, deleting, and synchronizing lifecycle changes. Its public results must allow callers to distinguish successful changes, read-only or unsupported files, conflicts, limits, stale edit state, and storage failures. Use a replaceable Vault storage adapter beneath this boundary, without requiring a particular class layout or test framework.
- Prefer public Obsidian APIs for file/folder context menus, modals, commands, status-bar registration, and event cleanup. Contain file explorer DOM dependence in a small tooltip compatibility layer. Never interpret comment text as Markdown or HTML.
- File explorer comment tooltips align with the filename's left edge, appear below the row with an 8px gap, and flip above when space is insufficient. Limit them to 320px wide and 160px high, further reduced to fit the viewport; wrap long lines and clip height overflow without scrolling. They do not receive pointer interactions and close about 150ms after leaving the row; switching rows clears the old tooltip immediately. Leave native tooltips unchanged. Fixed placement reduces overlap probability without guaranteeing collision avoidance. These rules apply to the file explorer, not the future status-bar tooltip.
- Use byte-aware input/output where needed to validate UTF-8 and control the BOM, line endings, escapes, and TC extension marker. Do not assume descript.ion always appears as an indexed Obsidian file.
- Accept valid UTF-8 with or without a BOM, and CR, LF, or CRLF record separators. ASCII is valid UTF-8; do not infer an originating editor or convert other encodings.
- Successful writes use BOM bytes `EF BB BF`, CRLF record separators, and no extra initial blank line. Names containing spaces are quoted. Single-line comments are ordinary text; TC-marked multiline comments encode newlines as literal backslash-n and backslashes as doubled backslashes, ending with UTF-8 bytes `04 C3 82`. Decode those escapes only for TC-marked records.
- Enforce a maximum of 4096 bytes for each complete serialized record, including the name, separator, escapes, extension marker, and CRLF. Reject oversized saves without losing the draft. Skip and report a lifecycle update that would exceed the limit, preserving the existing comment record.
- Follow the accepted decision “仅修改可完整理解的 UTF-8 备注文件”: unknown program markers, duplicate names, or malformed records make the entire description file read-only. Non-UTF-8 files are unsupported. Explain the reason and skip edits and synchronization; leave original bytes unchanged.
- Treat empty or whitespace-only input as comment deletion. Preserve spaces and newlines in nonempty input. Delete the description file when no comment entries or unrecognized content remain.
- Guarantee lifecycle maintenance for operations inside Obsidian. Use reliable old-path information for moves and renames; do not guess external object identity from unmatched deletion/creation events. Do not claim guaranteed tracking of moves by external file managers or sync tools.
- Maintain a renamed or moved folder's own entry in its parent description file. Internal description files move with the folder and retain their relative basenames; do not independently migrate all descendant comments because their containing folder moved.
- Follow the accepted decision “备注迁移失败时保留记录并提示”: an existing destination-name entry stops migration, preserving both records. For a cross-directory move, save the destination before removing the source. Destination failure leaves the source; source-removal failure leaves duplicates. Report comment synchronization failure without rolling back the already-completed object move. Do not claim a transaction across two description files.
- Direct movement, renaming, or deletion of descript.ion refreshes relevant displays without automatic reconstruction or record migration.
- Capture description-file state and target identity when opening an edit modal. If the stored description changes, or the target moves, is renamed, or disappears before save, pause the save, preserve input, and prompt the user to reload or reopen the target. No automatic merging is required; do not claim locking against concurrent external programs.
- The modal offers “保存”, “删除备注”, and “取消”. Enter inserts a newline; Ctrl/Cmd+Enter saves; Escape cancels. Apply stale-state and read-only protection to destructive edit actions as well as saves.
- The status item refers to the active file. Show a visually shortened comment with a full-text tooltip, or “添加备注” when absent; clicking opens the editor. Hide the item when no file is active. Edit folder comments through the explorer context menu.
- Reread stored comments on file explorer hover, modal opening, status-bar interaction, and active-file changes. Real-time background refresh is not required.
- Operate locally, without network calls or telemetry. Keep startup light, avoid unnecessary Vault scans, and register and clean up UI and listeners through Obsidian lifecycle helpers.

## Testing Decisions

- Use one primary automated testing seam: the comment service's public operations backed by a controllable Vault storage adapter. Exercise format handling, maintenance, and edit-state protection together through observable behavior rather than separately mocking each internal module.
- Good tests assert returned public outcomes, stored bytes, target file existence, unchanged protected files, and preserved drafts or records. Do not assert private helper calls, internal object layout, or implementation-specific event counts.
- Cover UTF-8 with and without BOM; all accepted line separators; quoted names; Chinese and other Unicode text; multiline escapes and the exact TC marker; literal backslash-n without a marker; and round-trip preservation.
- Cover exactly 4096 bytes and oversized complete records, including a name change that makes an existing comment oversized.
- Cover unsupported encoding, unknown markers, duplicate names, and malformed records through read, edit, and lifecycle maintenance. Confirm mutation attempts leave the whole original file unchanged.
- Cover add/update/delete, whitespace-only deletion, preservation of meaningful whitespace, and removal of the last entry's description file.
- Cover same-directory renames, cross-directory moves, folder parent-entry maintenance with unchanged internal relative records, deletion, destination conflicts, destination-write failure, and source-removal failure.
- Cover changed description-file state and changed or removed edit targets. Verify that saving or deleting does not overwrite external content or act on an obsolete target.
- Cover externally changed stored comments being reread on the next public interaction; do not require a background polling test.
- Reuse the existing Node test runner and esbuild-based service test setup, strict TypeScript build, and Obsidian ESLint checks. Passing build and lint are required.
- Validate real Obsidian UI behavior separately: tooltips, menus, modal buttons and shortcuts, plain-text rendering, status-bar states, stale edits, actual file/folder lifecycle event behavior, direct description-file operations, and cleanup of listeners/UI on disable.
- Verify bidirectional reads and writes with actual Total Commander, including Chinese text, spaced names, multiline comments, literal backslash-n, and backslashes. Capture real TC-produced byte fixtures for regression tests. Record automated validation and actual-application acceptance separately; both are required before declaring first-release acceptance complete.

## Out of Scope

- Mobile UI and lifecycle compatibility guarantees.
- ANSI/OEM or UTF-16 support, automatic encoding conversion, and support for unknown program extensions.
- Comments on the Vault root, descript.ion itself, or files outside the current Vault.
- Guaranteed comment tracking for external moves lacking reliable old-path identity, including moves by TC, system file managers, or synchronization tools.
- Copy-operation comment propagation, which was not requested.
- Automatic conflict merging, silent destination replacement, cross-file transactions, rolling back completed object moves, and guaranteed locking against external editors.
- Startup/background orphan scans and no-interaction real-time comment refresh.
- Explicit cleanup commands for orphan comments or empty description files (originally #7 and #8; confirmed cancelled per user requirement).
- Markdown/HTML rendering, multilingual UI configuration, cloud services, telemetry, and a separate global comment database.

## Further Notes

- This specification covers the full first-release scope, incorporating the accepted Q1–Q23 decisions, later confirmed file explorer tooltip changes, and the confirmed exclusion of orphan comment cleanup. With #2, #3, #4, #5, and #6 implemented and accepted, the required first-release scope is fully delivered.
- The accepted glossary and the two decisions about understood UTF-8 writes and migration failure handling remain the domain baseline. Implementation and acceptance evidence is recorded per task under `docs/testing/`.
- Context7 was used to research the official Obsidian developer documentation. Public APIs cover context menus, modals, events, and the desktop status bar, but no supported file explorer tooltip hook was found. The DOM layer requires actual Obsidian validation. See [Vault guidance](https://docs.obsidian.md/Plugins/Vault), [context menus](https://docs.obsidian.md/Plugins/User+interface/Context+menus), [status bar](https://docs.obsidian.md/Plugins/User+interface/Status+bar), and [official API types](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts).
- TC's author confirms the UTF-8 BOM and accepted line endings in the [format explanation](https://www.ghisler.ch/board/viewtopic.php?t=85478), the UTF-8 extension bytes in the [multiline extension explanation](https://www.ghisler.ch/board/viewtopic.php?t=45843), and marker-dependent escaping and the 4KB budget in the [escaping and length discussion](https://ghisler.ch/board/viewtopic.php?start=45&t=11238).
- Whether TC counts CRLF in its own 4096-byte limit was not conclusively established. Including CRLF is an accepted conservative project constraint, not a claim about the unresolved official detail.
- Public Obsidian APIs do not guarantee external rename recognition, directory descendant event counts/order, or transactions across two description files. The requirements deliberately avoid those guarantees.
- The local environment supports Node and npm. The user accepted #2 and #3 in the test Vault `D:\Libraries\Obsidian\Demo\`; #3's recorded versions are Obsidian 1.14.4 and Total Commander 11.58. Synthetic byte fixtures and passing build/lint remain distinct from real-application acceptance; real TC byte fixtures have not been committed.
