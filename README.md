# Descript.ion comments

为 Obsidian 桌面端 Vault 内的笔记、附件和文件夹查看、编辑兼容 Total Commander 的 UTF-8 备注。数据仅保存在对象父目录的 `descript.ion` 中，不修改笔记正文，无网络请求或遥测。

## 使用

在文件资源管理器右键文件或文件夹，选择 **编辑备注**。弹窗使用纯文本多行输入，不渲染 Markdown 或 HTML。

- **保存**：新增或修改备注；空或全空白输入删除备注，其他输入保留空格和换行。
- **删除备注**：删除当前条目；最后一条删除后移除备注文件。
- **取消** 或 Escape：关闭弹窗；Enter 换行，Ctrl/Cmd+Enter 保存。

Vault 根目录和 `descript.ion` 本身不接受备注。文件夹备注写在父目录，不影响文件夹内的备注文件。

在文件资源管理器悬浮笔记、附件或文件夹，查看纯文本备注；中文、换行、Markdown 和 HTML 均按字面内容显示。每次重新悬浮读取实际存储，TC 外部修改后下一次悬浮即可看到最新内容。无备注时不显示备注 Tooltip；读取失败或格式不可理解时显示原因，保持原文件。Tooltip 超出高度的内容直接裁切，可通过右键 **编辑备注** 查看全文。

备注 Tooltip 与文件名文字的左边缘对齐，默认显示在条目下方并留 8px 间距，空间不足时翻到上方；最大宽度 320px、最大高度 160px，窗口空间较小时进一步缩小。提示不接收鼠标交互，离开条目后约 150ms 关闭；移入提示不会延长显示，切换条目立即清除旧提示。官方时间提示保持现状，此位置调整降低重叠概率，不保证所有场景都无重叠。

当前已实现 issue #2 和 #3；状态栏、随移动/重命名/删除维护备注及孤立备注清理属于后续任务。

完整规格、任务进度和验收记录见[文档索引](docs/README.md)。

## 格式与编辑保护

读取带/不带 BOM 的合法 UTF-8，以及 CR、LF、CRLF 行分隔。写回统一 UTF-8 BOM 与 CRLF，无开头空行。名称含空白时加双引号。多行备注按 TC 规则转义换行和反斜杠，末尾为 `04 C3 82`；没有 TC 标记时，`\n` 保持字面文字。完整记录含名称、空格、转义、标记和 CRLF 最多 4096 字节，BOM 不计入记录。

非 UTF-8、重复名称、异常记录或未知程序标记会使整个文件不可修改并显示原因，原始字节不变。超限或存储失败时保留弹窗输入，可修改后重试。

Windows 下 TC 创建的备注文件可能带隐藏属性。遇到普通覆盖写入返回 `EPERM` 时，插件使用 Node 文件 API 以 `r+` 打开 Vault 内现有备注文件，写入并截断旧尾部，保留隐藏属性；不移除只读属性或更改访问权限。

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

最低 Obsidian 版本为 1.0.0：编辑入口使用公开的 file-menu、Modal、Scope、Vault 和 DataAdapter 二进制 API。悬浮入口依赖文件资源管理器私有 DOM，选择器集中在 `src/ui/file-tree-tooltip.ts`；Obsidian 更新后可能需要调整。此层通过文档上的事件委托兼容文件树重绘，禁用时清理监听、Tooltip 和尚未完成的读取结果。

## 本地安装

构建后将根目录的 `main.js`、`manifest.json`、`styles.css` 复制到测试 Vault 的 `.obsidian/plugins/descript-ion/`：

```powershell
$pluginPath = 'D:\Libraries\Obsidian\Demo\.obsidian\plugins\descript-ion'
New-Item -ItemType Directory -Force -Path $pluginPath
Copy-Item -LiteralPath main.js, manifest.json, styles.css -Destination $pluginPath
```

重新加载 Obsidian，在 **设置 → 第三方插件** 中启用 **Descript.ion comments**。更新时重新构建并复制这三个文件，再禁用/启用插件或重新加载应用。

真实应用验收由用户手动执行；步骤及结果记录见 [编辑验收记录](docs/testing/issue-2.md) 和 [悬浮验收记录](docs/testing/issue-3.md)。自动测试的合成字节样本不能替代真实 TC 双向兼容性验收。
