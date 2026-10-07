# 国际生英文高等数学：主教学系统入口

本课程使用与港口管理概论、经济数学、统计分析方法相同的课程工作区、课堂运行时、学生跟随和阅读进度服务。

- 课程：`course-international-mathematics`
- 课件：`deck-international-mathematics-jacques-2026`
- 版本：`release-international-mathematics-jacques-v2`
- 内容：16讲、32学时，每学时45分钟；1,280页核心课件和32页选学课件。

## 本机使用

从项目根目录运行 `scripts/start-classroom.ps1 -NoBrowser`，或双击 `start-classroom.bat`。

主教学系统为 <http://127.0.0.1:5173/>，课程工作区为 <http://127.0.0.1:5173/courses/course-international-mathematics>。
教师可在“课程／我的任教课程”中打开本课程；目录展示16讲及每讲两个45分钟学时，支持按学时预览。

- 预览不创建课堂，也不覆盖个人阅读位置。
- “Start / resume class”启动或恢复本课程最近的进行中课堂；学生通过课堂内生成的加入链接跟随教师。
- “Independent reading”使用英文阅读器、独立播放与个人进度；只有发出问题后才调用阅读助手。
- 分学时链接示例：`/preview/course-international-mathematics?lesson=14&hour=2`。
- 阅读器按课件键恢复既有阅读位置；显式讲次／学时链接优先于已保存位置。
- 课程目录、备课笔记、教学活动与课堂记录复用已有课程服务。原有课程和学习记录保留。

开发模式使用已有本地教师身份。校园生产模式仍执行教师权限和学生选课限制；课程内容的加入不会自动给未选课学生开放权限。

## 独立查看器与交付包

`http://127.0.0.1:5192/`是独立离线查看器，不包含主系统的课程工作区、账号或课堂同步。
最终PDF、双语教师手册和离线ZIP保存在 `output/international-mathematics/v2/`；源码及课堂媒体在主仓库内。

本机主系统的启动与验证不表示校园服务器已更新。服务器更新使用既有校园部署流程。
