# 《管理学》前四讲交付索引

已完成299个原页到367个网页页面的转换、110张Imagegen图片和8处同步演示。课程署名：管理学课程组 · 韦笑。核验截止：2026年9月14日。

## 直接使用

打开[本机管理学课程](http://127.0.0.1:5173/courses/management-principles)，选择第一至第四讲并开始授课。授课页的“原PPT页码定位”按原文件、页码跳转；第四讲的两份文件分别列出。演示页由教师推进、调整参数或重置，学生通过已有课堂加入方式同步观看。正式课程代码和总学时显示待完善。

| 讲次 | 原页 | 网页 |
|---|---:|---:|
| 第一讲：管理导论 | 56 | 67 |
| 第二讲：管理理论的历史演变 | 67 | 79 |
| 第三讲：决策与决策过程 | 65 | 81 |
| 第四讲：环境分析与理性决策 | 111 | 140 |
| 合计 | 299 | 367 |

## 教师审阅材料

- [原页与网页对照](../../output/management-principles/review/index.html)：299个原页逐页对应，可展开文字、修改理由和来源。
- [逐页更新记录](updates.json)：原表述、新表述、来源、期间及修改理由。
- [原页映射](source-map.json)：文件校验值、拆页关系和私有制作记录。
- [计算复核](calculation-audit.json)：原例题参数、复算结果与历史报表差异。
- [事实核验说明](FACT-CHECK-NOTES.md)及[来源目录](sources.mjs)。
- [图片清单与提示词](image-manifest.json)：110张原件、采用版本、校验值及页面关联；单张提示记录在[images目录](images/)，原件在[生成原件目录](../../output/management-principles/images/originals/)。
- [验证报告](VERIFICATION.md)、[完整视觉审阅记录](visual-review.json)和[实施说明](IMPLEMENTATION.md)。

## 工作区文件

| 内容 | 位置 |
|---|---|
| 原PPTX、提取索引、299张原稿渲染 | `output/management-principles/source/` |
| 逐页可编辑正文 | `docs/management/authored/` |
| 页面、目录与演示定义 | `packages/course-content/src/management-principles/` |
| 网页组件与样式 | `apps/teacher-web/src/features/management-principles/` |
| 公开图片 | `apps/teacher-web/public/course-assets/management-principles/` |
| 最终运行截图、日志与校验结果 | `output/management-principles/qa/` |
| 最终校内发布包 | `output/management-campus-20260914-final/` |

校内发布使用带`-final`的目录，包含已验证的最终前端与独立服务。`output`中的教师对照、原稿、提示词、测试账号及状态备份是工作区材料，不应整体复制到公开网页目录。课程的学生资源已由发布脚本与缓存清单单独收集。

本机接口与网页服务已经运行。后续启动可使用项目现有[课堂启动脚本](../../scripts/start-classroom.ps1)。实际校园网络接入、正式课程代码与总学时由相应环境和课程资料补齐。
