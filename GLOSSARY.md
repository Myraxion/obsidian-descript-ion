# 文件备注

本项目为 Obsidian Vault 内的文件与文件夹提供与 Total Commander 兼容的 descript.ion 备注。

## Language

**备注对象（Comment target）**:
可以关联备注的 Vault 内文件或文件夹；Vault 根目录和备注文件本身不属于备注对象。
_Avoid_: 笔记正文、备注文件

**备注（Comment）**:
用户为文件或文件夹填写的说明文字，可以包含多行内容。
_Avoid_: 代码注释、笔记正文

**统一悬浮提示（Unified tooltip）**:
文件资源管理器中，将当前备注对象的备注与 Obsidian 原有提示信息一起呈现的单个悬浮提示；备注位于上方，原有提示信息位于下方。
_Avoid_: 双 Tooltip、备注覆盖官方信息

**备注文件（Description file）**:
名为 descript.ion、存放所在目录内文件与文件夹备注的文件。
_Avoid_: 全库备注数据库

**备注条目（Comment entry）**:
备注文件中将一个文件或文件夹名称与其备注关联的记录。
_Avoid_: 笔记段落

**孤立备注（Orphan comment）**:
对应文件或文件夹在备注文件所在目录中已不存在的备注条目。
_Avoid_: 空备注、未在文件列表中显示的备注

**当前目录（Current directory）**:
当前活动文件所在的父目录。
_Avoid_: 当前工作目录、文件列表中选中的目录
