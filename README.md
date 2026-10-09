# Descript.ion comments

为 Obsidian 桌面端 Vault 内的笔记、附件和文件夹查看、编辑兼容 Total Commander 的 UTF-8 备注。数据仅保存在对象父目录的 `descript.ion` 中，不修改笔记正文，无网络请求或遥测。

## 使用

在文件资源管理器右键文件或文件夹，选择 **编辑备注**。弹窗使用纯文本多行输入，不渲染 Markdown 或 HTML。

- **保存**：新增或修改备注；空或全空白输入删除备注，其他输入保留空格和换行。
- **删除备注**：删除当前条目；最后一条删除后移除备注文件。
- **取消** 或 Escape：关闭弹窗；Enter 换行，Ctrl/Cmd+Enter 保存。

Vault 根目录和 `descript.ion` 本身不接受备注。文件夹备注写在父目录，不影响文件夹内的备注文件。

本次实现对应 issue #2；悬浮提示、状态栏、随移动/重命名/删除维护备注及孤立备注清理属于后续任务。

## 格式与编辑保护

读取带/不带 BOM 的合法 UTF-8，以及 CR、LF、CRLF 行分隔。写回统一 UTF-8 BOM 与 CRLF，无开头空行。名称含空白时加双引号。多行备注按 TC 规则转义换行和反斜杠，末尾为 `04 C3 82`；没有 TC 标记时，`\n` 保持字面文字。完整记录含名称、空格、转义、标记和 CRLF 最多 4096 字节，BOM 不计入记录。

非 UTF-8、重复名称、异常记录或未知程序标记会使整个文件不可修改并显示原因，原始字节不变。超限或存储失败时保留弹窗输入，可修改后重试。

打开和提交时都读取实际存储。编辑期间备注文件改变，或对象被移动、重命名、删除，会暂停保存和删除，保留草稿；请先复制草稿，取消后重新打开对象并核对最新备注。不自动合并，也不提供跨程序文件锁；外部程序恰好在最后检查与写入之间修改仍可能发生竞争。

## 构建与检查

使用 Node.js 22/24 LTS 和 npm：

```powershell
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

`npm run dev` 开启 esbuild 监视。测试用 Node 内建测试运行器与已有 esbuild，唯一主要边界为备注服务公开操作和可替换存储适配器。`.test-build/` 和 `main.js` 为忽略的生成产物。

最低 Obsidian 版本为 1.0.0：使用公开的 file-menu、Modal、Scope、Vault 和 DataAdapter 二进制 API，不依赖文件资源管理器私有 DOM。

## 本地安装

构建后将根目录的 `main.js`、`manifest.json`、`styles.css` 复制到测试 Vault 的 `.obsidian/plugins/descript-ion/`：

```powershell
$pluginPath = 'D:\Libraries\Obsidian\Demo\.obsidian\plugins\descript-ion'
New-Item -ItemType Directory -Force -Path $pluginPath
Copy-Item -LiteralPath main.js, manifest.json, styles.css -Destination $pluginPath
```

重新加载 Obsidian，在 **设置 → 第三方插件** 中启用 **Descript.ion comments**。更新时重新构建并复制这三个文件，再禁用/启用插件或重新加载应用。

真实应用验收由用户手动执行；步骤及结果记录见 [验收记录](docs/testing/issue-2.md)。自动测试的合成字节样本不能替代真实 TC 双向兼容性验收。
