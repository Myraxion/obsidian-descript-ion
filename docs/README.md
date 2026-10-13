# 文档索引

## 当前进度

2026-10-10：#2 右键编辑、#3 文件树悬浮备注、#4 状态栏查看及编辑、#5 同目录重命名与删除同步、#6 跨目录移动迁移均已完成并通过用户验收；孤立备注清理（#7、#8）根据用户需求确认取消（wontfix），首版功能已全部交付。完整规格见[规格](specs/descript-ion.md)，任务状态见[任务索引](design/descript-ion-tickets.md)。

2026-10-13：用户确认已完成最新重构版本的真实应用验收，见[核心实现审查修复与最新验收记录](testing/review-fixes.md)。最低 Obsidian 版本调整为 `1.14.4`，优先支持 Windows。

## 需求与设计

- [首版规格](specs/descript-ion.md)：完整目标、行为和测试边界。
- [首版设计](design/descript-ion.md)：需求决策、格式兼容调研及限制。
- [实现任务](design/descript-ion-tickets.md)：纵向拆分、状态及依赖。
- [文件树 Tooltip](design/file-tree-tooltip-position.md)：最终位置、尺寸和交互规则。

## 验收与架构决策

- [#2 编辑验收](testing/issue-2.md)：格式、编辑保护和 Windows 隐藏文件保存。
- [#3 悬浮验收](testing/issue-3.md)：最新存储读取、最终 Tooltip 行为和应用版本。
- [#4 状态栏验收](testing/issue-4.md)：活动文件备注显示、截断悬浮、点击编辑、外部读取感知与平滑更新。
- [#5 重命名与删除维护验收](testing/issue-5.md)：同目录重命名与删除同步、空文件自动移除、只读与冲突保护。
- [#6 跨目录移动迁移验收](testing/issue-6.md)：跨目录移动迁移、两阶段写入容错、冲突与超限保护。
- [核心实现审查修复与最新验收](testing/review-fixes.md)：存储、维护执行与编辑器生命周期回归，以及用户确认的最新版本真实应用验收。
- [ADR 0001](adr/0001-utf8-tc-compatible-writes.md)：仅修改可完整理解的 UTF-8 备注文件。
- [ADR 0002](adr/0002-comment-move-failures.md)：迁移失败时保留记录并提示。

## 代理工作约定

- [Issue tracker](agents/issue-tracker.md)
- [Triage labels](agents/triage-labels.md)
- [Domain docs](agents/domain.md)

安装与使用见[项目 README](../README.md)（[中文](../README_zh.md)），领域术语见[词汇表](../GLOSSARY.md)。
