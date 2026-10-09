# 经济数学课程顺序与版本

第1讲为课程引入，40页、45分钟。第2讲为59页、两个45分钟课时，第一课时1–29页、第二课时30–59页，五次独立练习共20分钟。第3–32讲编号与内容保留。当前共421页、32讲。

大纲64学时：第1讲1学时、第2讲2学时、后续60学时，已分配63学时；剩余1学时待课程层面安排。

当前版本 `release-economic-mathematics-lesson02-mapping-2026-10-09`，Deck `deck-economic-mathematics-2026-lesson02-mapping`。第二讲页面键 `em-l02-refined-mapping-p001` 至 `p059`。注册、导航、课堂范围与导出读取清单。

| 已归档版本 | 第二讲页数 | 课程页数 | 专属归档目录 |
| --- | --- | --- | --- |
| 2026-10-09重排版 | 26 | 388 | lesson-02-26pages-2026-10-09 |
| lesson02-refined | 50 | 412 | lesson-02-50pages-2026-10-09 |
| lesson02-flow | 60 | 422 | lesson-02-60pages-2026-10-09 |

目录位于 `archive/courseware/economic-mathematics/`。60页版连同内容、专属代码、封面、资源清单、文档和三份PDF归档，附SHA-256清单与恢复说明。V1、348页V2及以上各历史版本的课堂保留原版本、页码和互动状态，显示归档提示，禁止自动映射到当前页码。

独立讲解入口 `/economic-narration.html?lesson=2&page=1`，缓存命名空间 `economic-narration-lesson02-mapping-v1`。数字人只使用已公开段落；练习计时与答案公开由教师控制。

运行 `pnpm --filter @edu/teacher-web exec tsx scripts/export-economic-refined.tsx` 更新打印页、讲稿、练习和源文件指纹，再按CSS尺寸导出PDF。完整课件与打印页共用React、KaTeX及原生图形。输出位于 `output/pdf/`，本次验收证据位于 `output/pdf/lesson02-mapping-review/`。
