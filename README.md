# Descript.ion comments

English | [简体中文](README_zh.md)

Add **file and folder comments** to Obsidian.

All comments are stored in `descript.ion` files in the corresponding directory—a plain-text annotation standard widely adopted by file managers (such as Total Commander). Runs 100% locally with zero network requests, enabling seamless two-way interoperability between Obsidian and external file managers.

---

## ✨ Features

- 📝 **Easy Editing**: Right-click any file, attachment, or folder in the File Explorer to quickly add, edit, or delete comments; supports multiline input.
- 👁️ **Hover Preview**: Hover over any item in the File Explorer to view comments instantly in a lightweight tooltip without opening the file.
- 📌 **Status Bar Integration**: Real-time display of the active note's comment in the bottom status bar; hover to view full multiline comments, click to open the edit modal directly.
- 🔄 **Automatic Lifecycle Sync**: Automatically renames, deletes, and migrates comments when files or folders are renamed, deleted, or moved across directories in Obsidian.
- 🛡️ **Non-intrusive**: Never touches or pollutes your Markdown note content; fully functional even outside of Obsidian.

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
- **Multiline Escaping**: Complies with Total Commander's multiline escaping format for seamless two-way compatibility with external tools.
- **Scope**: Comments are supported for regular files and folders inside the vault. The vault root and `descript.ion` files themselves cannot have comments.
- **Record Limit**: Single complete records (including file name, escaped content, and markers) are supported up to 4096 bytes.

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
To ensure complete data safety, the plugin strictly follows the "read-only protection on anomaly" principle. If an existing <code>descript.ion</code> contains ANSI encoding, duplicate entries, corrupted records, or unknown third-party markers, the plugin refuses writes to prevent damaging the original file. We recommend opening the file in an external editor and saving it as UTF-8 before editing again.
</details>

<details>
<summary><b>Will hidden descript.ion files on Windows lose their hidden attribute?</b></summary>
No. The plugin specifically handles hidden comment files created by Total Commander on Windows, preserving the hidden attribute (+H) during writes and updates.
</details>

<details>
<summary><b>Will comments be lost if a move or rename fails?</b></summary>
No. When moving or renaming across directories, if a target conflict or write failure occurs, the plugin safely preserves the source record and displays a clear error notice, preventing silent data loss.
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
