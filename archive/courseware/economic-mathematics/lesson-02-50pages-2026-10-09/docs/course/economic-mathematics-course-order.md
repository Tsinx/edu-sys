# 经济数学讲次与课时 · 2026-10-09

第1讲为课程引入，40页、45分钟。第2讲已独立重写为50页、两个45分钟课时，其中五次课堂练习共20分钟。第3—32讲编号和内容不变。当前课程入口共412页、32讲。

教学大纲仍为64学时；现有讲次实际分配合计63学时，另1学时待课程层面统筹实践或复习。不得把这一学时默默加回已确认90分钟的第二讲，也不得无授权修改其他讲次。

当前版本 `release-economic-mathematics-lesson02-refined-2026-10-09`，Deck `deck-economic-mathematics-2026-lesson02-refined`。第二讲采用独立页面键 `em-l02-refined-p001` 至 `p050`。

原合并第二讲26页和388页课程版本的相关源文件已存入 `archive/courseware/economic-mathematics/lesson-02-26pages-2026-10-09/`，包含SHA-256清单和恢复说明。原V1、原348页V2、原388页重排版课堂均保留原版本、页码和实验状态，访问时显示归档提示，禁止映射到新版页码。

独立播放器采用新的存储命名空间，不读取原26页播放器的页码与步骤。第1讲原有存储仍有效。新版入口 `/economic-narration.html?lesson=2&page=1`。

逐页脚本见 `economic-mathematics-lesson-02-script.md`；课堂练习和课后题答案见 `economic-mathematics-lesson-02-exercises.md`。PDF导出与正式显示共享React、KaTeX和图形模型；运行 `pnpm --filter @edu/teacher-web exec tsx scripts/export-economic-refined.tsx` 生成三个打印页面，再使用浏览器按CSS纸张尺寸打印PDF。导出源文件指纹保存在 `output/pdf/economic-lesson02-source-fingerprint.json`。
