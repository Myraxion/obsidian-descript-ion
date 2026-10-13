# Descript.ion comments

English | [简体中文](README_zh.md)

Add **file and folder comments** to Obsidian.

All comments are stored in `descript.ion` files in the corresponding directory, a plain-text format used by file managers such as Total Commander. The plugin runs locally with no network requests and shares UTF-8 comments with compatible external tools.

Requires Obsidian **1.14.4 or later** on desktop. **Windows is the primary supported and tested platform**; macOS and Linux have not received the same level of validation. Mobile is not supported.

---

## ✨ Features

- 📝 **Easy Editing**: Right-click any file, attachment, or folder in the File Explorer to quickly add, edit, or delete comments; supports multiline input.
- 👁️ **Hover Preview**: Hover over any item in the File Explorer to view comments instantly in a lightweight tooltip without opening the file.
- 📌 **Status Bar Integration**: Real-time display of the active note's comment in the bottom status bar; hover to view full multiline comments, click to open the edit modal directly.
- 🔄 **Automatic Lifecycle Sync**: Automatically renames, deletes, and migrates comments when files or folders are renamed, deleted, or moved across directories in Obsidian.
- 🛡️ **Non-intrusive**: Stores comments separately from Markdown note content; compatible file managers can read them outside Obsidian.

---

## 📖 User Guide

### 1. Editing & Deleting Comments
- **Open Editor**:
  - In the File Explorer, **right-click** any file or folder and select **Edit comment**.
  - Or directly **click the comment area in the status bar** (displays **Add comment** when no comment exists).
- **Keyboard Shortcuts**:
  - `Enter`: Insert new lines for multiline text.
  - `Ctrl` / `Cmd` + `Enter`: Save comment.
  - `Escape`: Cancel and close the modal.
- **Delete Comment**:
  - Click the **Delete comment** button in the bottom-left corner of the modal;
  - Or clear the input content (empty or whitespace-only) and click Save.

### 2. Hover to View Comments
- Hover over any note, attachment, image, or folder name in the File Explorer to display a comment preview tooltip beneath it.
- Tooltips display literal raw text (fully preserving newlines and spaces) and close automatically ~150ms after the mouse leaves.
- If an external program (e.g., Total Commander) updates comments, the latest content is reflected immediately on the next hover.

### 3. Status Bar Integration
- Opening a note in the editor displays its comment in the bottom status bar.
- Long comments are automatically truncated in the status bar; hover over the text to view full multiline content.
- Click the status bar entry anytime to open the edit modal.
- The status bar item automatically hides when no file is active or when viewing an unsupported object.

### 4. File Lifecycle & Auto-maintenance
The plugin automatically maintains `descript.ion` consistency in the background:
- **Rename in same directory**: Automatically updates the comment entry with the new name.
- **Move across directories**: Automatically migrates the comment from the source directory's `descript.ion` to the destination directory's `descript.ion`.
- **Delete file/folder**: Automatically removes the corresponding comment entry; if a directory has no comments left, the empty `descript.ion` file is automatically deleted.

---

## ⚙️ Format & Compatibility

- **Storage Specifications**: Standard UTF-8 encoding (with BOM) and CRLF line breaks; file names containing spaces are automatically enclosed in double quotes.
- **Multiline Escaping**: Uses Total Commander's multiline escaping format. Compatibility is limited to UTF-8 records the plugin can fully parse; ANSI files and unknown third-party markers are read-only.
- **Scope**: Comments are supported for regular files and folders inside the vault. The vault root and `descript.ion` files themselves cannot have comments.
- **Record Limit**: Single complete records (including file name, escaped content, and markers) are supported up to 4096 bytes.
- **Concurrent Editing**: Changes detected before saving block an outdated edit. The plugin does not lock external tools or provide a transaction across directories; avoid simultaneous edits to the same `descript.ion` file.

---

## 📥 Installation

### Method 1: Community Plugins (Recommended)
*(Available once approved)*
1. Open Obsidian **Settings** → **Community plugins**.
2. Turn off "Restricted mode", then click **Browse**.
3. Search for `Descript.ion comments` and install it.
4. Once installed, click **Enable**.

### Method 2: Manual Installation
1. Download the latest release assets (`main.js`, `manifest.json`, `styles.css`) from [GitHub Releases](https://github.com/Myraxion/obsidian-descript-ion/releases).
2. Inside your Obsidian vault, navigate to or create the plugin directory:
   `<Vault>/.obsidian/plugins/descript-ion/`
3. Copy the downloaded `main.js`, `manifest.json`, and `styles.css` into that directory.
4. Open Obsidian **Settings** → **Community plugins**, reload and enable **Descript.ion comments**.

---

## ❓ FAQ

<details>
<summary><b>Why does it say "Description file is not valid UTF-8 and cannot be modified"?</b></summary>
The plugin refuses to modify files it cannot fully parse. Non-UTF-8 encoding, duplicate entries, corrupted records, and unknown third-party markers each block writes. For an encoding error, convert the file to UTF-8 in an external editor. Duplicate entries, malformed records, and unknown markers need to be resolved separately before editing again.
</details>

<details>
<summary><b>Will hidden descript.ion files on Windows lose their hidden attribute?</b></summary>
The plugin stages the new bytes in a temporary file before replacing the original. On Windows, replacement temporarily clears the destination's hidden attribute, then attempts to restore it on success or failure. If the system refuses the attribute change, the file may remain visible.
</details>

<details>
<summary><b>Will comments be lost if a move or rename fails?</b></summary>
For detected conflicts or write failures, the plugin preserves the source record and shows an error notice. Cross-directory moves write the destination first, then remove the source entry; if source cleanup fails, both copies remain. These safeguards do not cover every filesystem failure or simultaneous external write.
</details>

---

## 🛠️ Local Development

To run tests or build from source:

```bash
# Install dependencies
npm install

# Run code style checks and automated tests
npm run lint
npm test

# Build production bundle
npm run build
```

See the [Documentation Index](docs/README.md) for design specifications, architecture decisions, and test records.

---

## 📄 License

This project is licensed under the [MIT](LICENSE) License.
