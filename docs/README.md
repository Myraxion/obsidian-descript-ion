# 文档索引

## 当前进度

2026-10-09：#2 右键编辑与 #3 文件树悬浮备注均已完成并通过用户验收；状态栏、生命周期备注维护和孤立备注清理尚未完成。完整首版范围见[规格](specs/descript-ion.md)，任务状态和依赖见[任务索引](design/descript-ion-tickets.md)。

## 需求与设计

- [首版规格](specs/descript-ion.md)：完整目标、行为和测试边界。
- [首版设计](design/descript-ion.md)：需求决策、格式兼容调研及限制。
- [实现任务](design/descript-ion-tickets.md)：纵向拆分、状态及依赖。
- [文件树 Tooltip](design/file-tree-tooltip-position.md)：最终位置、尺寸和交互规则。

## 验收与架构决策

- [#2 编辑验收](testing/issue-2.md)：格式、编辑保护和 Windows 隐藏文件保存。
- [#3 悬浮验收](testing/issue-3.md)：最新存储读取、最终 Tooltip 行为和应用版本。
- [ADR 0001](adr/0001-utf8-tc-compatible-writes.md)：仅修改可完整理解的 UTF-8 备注文件。
- [ADR 0002](adr/0002-comment-move-failures.md)：迁移失败时保留记录并提示。

## 代理工作约定

- [Issue tracker](agents/issue-tracker.md)
- [Triage labels](agents/triage-labels.md)
- [Domain docs](agents/domain.md)

安装与使用见[项目 README](../README.md)，领域术语见[词汇表](../GLOSSARY.md)。
