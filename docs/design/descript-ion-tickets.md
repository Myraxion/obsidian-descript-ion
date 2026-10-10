# descript.ion 实现任务

用户已确认以下纵向拆分。任务以 [规格 Issue #1](https://github.com/Myraxion/obsidian-descript-ion/issues/1) 为父 issue，使用 GitHub 原生阻塞关系。以下状态更新于 2026-10-10，实时状态以 GitHub 为准。

| 任务 | 交付 | 前置任务 | 状态 |
| --- | --- | --- | --- |
| [T1 / #2](https://github.com/Myraxion/obsidian-descript-ion/issues/2) | 右键编辑 UTF-8 文件备注，包含 TC 格式与编辑保护 | 无 | 已完成，验收通过 |
| [T2 / #3](https://github.com/Myraxion/obsidian-descript-ion/issues/3) | 文件列表悬浮显示最新备注 | #2 | 已完成，验收通过 |
| [T3 / #4](https://github.com/Myraxion/obsidian-descript-ion/issues/4) | 状态栏查看与编辑活动文件备注 | #2 | 已完成，验收通过 |
| [T4 / #5](https://github.com/Myraxion/obsidian-descript-ion/issues/5) | 同目录重命名与删除时维护备注 | #2 | 已实现，待手动验收 |
| [T5 / #6](https://github.com/Myraxion/obsidian-descript-ion/issues/6) | 跨目录迁移备注并处理冲突和失败 | #5 | 等待 #5 |
| [T6 / #7](https://github.com/Myraxion/obsidian-descript-ion/issues/7) | 清理当前目录孤立备注与空备注文件 | #2 | 待实现，前置已完成 |
| [T7 / #8](https://github.com/Myraxion/obsidian-descript-ion/issues/8) | 递归清理整库孤立备注与空备注文件 | #7 | 等待 #7 |

## 执行规则

- 每个任务包含可实际使用的入口、存储行为和验收；格式、存储和测试基础并入 T1，不作为独立水平任务。
- 复用已确认的备注服务公开操作测试边界，只断言公开结果、存储字节与文件存在性；真实 Obsidian/TC 验收属于相应任务的验收条件。
- #2、#3、#4 已完成；后续可选择 #5 或 #7，#6 等待 #5，#8 等待 #7。
- 原生阻塞关系是 tracker 中的执行依据；`ready-for-agent` 标签不表示阻塞任务可以提前开始。
- 已完成任务的证据见 [#2 验收](../testing/issue-2.md)、[#3 验收](../testing/issue-3.md) 与 [#4 验收](../testing/issue-4.md)；整体首版尚未完成。
