# 《管理学》前八讲交付索引

前八讲已覆盖 **517 个原页、663 个网页页面、190 张 Imagegen 图片、16 处教师控制演示**。第二期新增第 5—8 讲：218 个原页转换为 296 个网页页面，新增 80 张图片与 8 处演示。课程署名：管理学课程组 · 韦笑。第二期核验日期：2026 年 9 月 15 日。

## 直接使用

打开[本机管理学课程](http://127.0.0.1:5173/courses/management-principles)，选择讲次开始授课。授课页的“原 PPT 页码定位”按原文件、页码跳转；第四讲的两份文件分别列出，第五至第八讲各有独立来源标识。演示由教师推进、调整参数或重置，学生同步只读观看；刷新后恢复页面和已揭示步骤。正式课程代码、总学时继续显示“待完善”。

| 讲次 | 原页 | 网页页数 | 全课页码 | Imagegen 图片 |
|---|---:|---:|---|---:|
| 第一讲：管理导论 | 56 | 67 | 1—67 | 22 |
| 第二讲：管理理论的历史演变 | 67 | 79 | 68—146 | 24 |
| 第三讲：决策与决策过程 | 65 | 81 | 147—227 | 24 |
| 第四讲：环境分析与理性决策 | 111 | 140 | 228—367 | 40 |
| 第五讲：决策的实施与调整 | 60 | 82 | 368—449 | 22 |
| 第六讲：组织设计 | 64 | 91 | 450—540 | 24 |
| 第七讲：人员配备 | 55 | 66 | 541—606 | 20 |
| 第八讲：组织文化 | 39 | 57 | 607—663 | 14 |
| 合计 | **517** | **663** | **1—663** | **190** |

## 教师审阅材料

- [前八讲原页与网页对照](../../output/management-principles/review-phase2/index.html)：517 个原页逐页对应，可展开原文、新文、修改理由和来源。
- [全课更新记录](updates.json)、[第二期更新记录](updates-phase2.json)：原表述、新表述、来源、统计或历史期间、理由。
- [全课原页映射](source-map.json)、[第二期映射](source-map-phase2.json)：网页页面的原文件、原页码、拆页序号、校验值和私有记录。
- [第二期事实与计算说明](FACT-CHECK-NOTES-PHASE2.md)、[复算结果](../../output/management-principles/qa-phase2/calculation-audit.json)、[21 项来源目录](sources-phase2.mjs)。
- [新增 80 张图片及独立提示词](image-manifest-phase2.json)、[单张制作记录](images-phase2/)、[生成原件](../../output/management-principles/images-phase2/originals/)、[全课图片索引](image-manifest.json)。编号 mg-111 至 mg-190，保留生成原件和网页采用版本的 SHA-256。
- [第二期验证报告](VERIFICATION-PHASE2.md)、[逐页视觉审阅记录](visual-review-phase2.json)、[实施说明](IMPLEMENTATION-PHASE2.md)。

## 工作区文件

| 内容 | 位置 |
|---|---|
| 第二期原 PPTX、提取索引、218 张原稿渲染 | `output/management-principles/source-phase2/` |
| 逐页可编辑正文 | `docs/management/authored/` |
| 页面、目录与演示定义 | `packages/course-content/src/management-principles/` |
| 网页组件与样式 | `apps/teacher-web/src/features/management-principles/` |
| 公开图片 | `apps/teacher-web/public/course-assets/management-principles/` |
| 第二期运行截图、日志与校验结果 | `output/management-principles/qa-phase2/` |
| 最终前八讲校内资源包 | [campus-management-phase2-20260915-delivery-final](../../output/campus-management-phase2-20260915-delivery-final/) |

最终资源包版本为 `campus-20260915130552670`，已验证独立安装、启动与 633 项发布资源。管理学资源组包含 199 个文件（190 张生成图片和 9 张原始资料图片），共 36,941,426 字节。公开资源由发布脚本与缓存清单收集；教师对照、原稿、完整提示词和测试数据保留在工作区，不应将整个 `output` 目录作为公开静态资源发布。

后续本机启动使用现有[课堂启动脚本](../../scripts/start-classroom.ps1)。本次交付为工作区课件及校内资源包，未进行外部部署。

## 第一期存档

前四讲 367 页的标识、顺序和公开内容，以及原有 110 张图片均通过基线比对。第一期[原页对照](../../output/management-principles/review/index.html)、[验证报告](VERIFICATION.md)、[视觉审阅](visual-review.json)、[事实核验](FACT-CHECK-NOTES.md)、[实施说明](IMPLEMENTATION.md)、[发布包](../../output/management-campus-20260914-final/)保留。另有[第一期基线快照](../../output/management-principles/phase1-baseline/manifest.json)及[本次比对结果](../../output/management-principles/qa-phase2/baseline-audit.json)。
