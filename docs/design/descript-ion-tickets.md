# descript.ion 实现任务

用户已确认以下纵向拆分。任务以 [规格 Issue #1](https://github.com/Myraxion/obsidian-descript-ion/issues/1) 为父 issue，全部标记为 `ready-for-agent`，使用 GitHub 原生阻塞关系。

| 任务 | 交付 | 被阻塞于 |
| --- | --- | --- |
| [T1 / #2](https://github.com/Myraxion/obsidian-descript-ion/issues/2) | 右键查看与编辑 UTF-8 文件备注，包含 TC 格式、编辑保护与主要测试边界 | 无 |
| [T2 / #3](https://github.com/Myraxion/obsidian-descript-ion/issues/3) | 文件列表悬浮显示最新备注 | #2 |
| [T3 / #4](https://github.com/Myraxion/obsidian-descript-ion/issues/4) | 状态栏查看与编辑活动文件备注 | #2 |
| [T4 / #5](https://github.com/Myraxion/obsidian-descript-ion/issues/5) | 同目录重命名与删除时维护备注 | #2 |
| [T5 / #6](https://github.com/Myraxion/obsidian-descript-ion/issues/6) | 跨目录移动时迁移备注并处理冲突和失败 | #5 |
| [T6 / #7](https://github.com/Myraxion/obsidian-descript-ion/issues/7) | 清理当前目录孤立备注与空备注文件 | #2 |
| [T7 / #8](https://github.com/Myraxion/obsidian-descript-ion/issues/8) | 递归清理整库孤立备注与空备注文件 | #7 |

## 执行规则

- 每个任务包含可实际使用的入口、存储行为和验收；格式、存储和测试基础并入 T1，不作为独立水平任务。
- 复用已确认的备注服务公开操作测试边界，只断言公开结果、存储字节与文件存在性；真实 Obsidian/TC 验收属于相应任务的验收条件。
- 当前首个可开始的任务是 #2。其完成后，#3、#4、#5、#7 可以并行；#6 等待 #5，#8 等待 #7。
- 原生阻塞关系是 tracker 中的执行依据；`ready-for-agent` 标签不表示阻塞任务可以提前开始。
- 本次工作发布实现任务，不执行功能实现。
