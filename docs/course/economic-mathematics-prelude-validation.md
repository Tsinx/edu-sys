# 中文经济数学序章 · 本地交付验收

验收日期：2026-10-08。范围为独立序章；正式经济数学32讲不作改版。

短片修订：`chromatic-motion-v2-2026-10-08`。采用钴蓝、亮黄、鲜绿撞色；加入俯冲、低机位掠过、大幅环绕、几何碰撞和900字重黑体。按追加要求增加数学术语，原“文字不超过12秒”的限制由本次要求替代。

## 已交付

- 90秒几何动态艺术短片：1920×1200、60fps、H.264/AAC立体声，5400帧。
- 15秒代表性样片：点场、块体、线束、三维曲面，900帧。
- 40页、45分钟交互序章；课程资源入口与课件目录上方入口。
- 完整答案、逐页讲稿及教师备注组成的40页备课PDF；投影部分保持1600×1000，教师备注位于其下方。
- 原始动画代码、构建和音轨脚本、分镜、资源来源、逐页备课脚本、文件哈希清单与完整离线ZIP。

## 本地验证结果

| 检查 | 结果 |
| --- | --- |
| 主课程兼容 | 课程ID、现有V2的348页、32讲与64学时保持原样；只增加独立资源入口 |
| 教学路线 | 六部分分别为90、750、360、780、600、120秒；合计2700秒；八单元学时合计64 |
| 学生文案 | 40页全部公开步骤及既有经济数学页面通过审计；无教师编写语言或备课字段进入投影DOM |
| 数学 | 收入门槛1/9、整数销量112件、利润例整数134件；累计与预算响应计算和课程模型一致；水平切片与三维等高线共用G(x,y)，逐点核对等值关系 |
| 动画结构 | 七段时间轴连续；14组文字共23.2秒；主点逐帧坐标有限、在画面内，相邻帧最大位移约9.35逻辑像素，详见media-qa.json |
| 媒体 | 15秒与90秒均逐帧计数及完整解码通过；原创48kHz双声道音轨，120 BPM；动作重音共享秒制时间轴 |
| 桌面浏览 | 1440×1040下逐页检查40页及全部展开状态；未发现文本越界、横向溢出或教师元数据 |
| 窄屏浏览 | 390×844下遍历40页；画布保持16:10，控制栏可操作，无横向溢出 |
| 演示控制 | 全屏、空格揭示、Esc退出、返回页面恢复、刷新恢复、重播与暂停、静音已操作；影片结束自动进入第2页 |
| 版本与隔离 | 无效页码、非整数步骤、版本冲突、异常播放位置被规范化或拒绝；未展开答案不进入公开上下文 |
| 原课堂回归 | 现有SSE、服务重启恢复、版本冲突、归档身份与助教上下文保护测试通过；独立序章本身不创建在线课堂 |
| PDF | 40页全部栅格化并查看静态输出；修复CID字体嵌入后改为嵌入静态TrueType字体；完整答案、备注、文字边界与顺序核对通过 |
| 构建 | 10项课件/序章测试与13项平台上下文/经济数学测试通过；工作区类型检查、生产构建和git diff --check通过 |

音轨与视频采用相同秒制时间轴，帧时间戳严格递增。静态检查及本地播放不能替代教室声学与投影条件下的听看体验。

撞色版的23个碰撞重音由动画时间表直接生成。15秒样片使用四段对应的音轨摘录，并在音频片段边缘加5毫秒淡入淡出。旧版短片及源文件已保存为 `output/economic-mathematics/prelude-v1/history/muted-before-color-motion-2026-10-08.zip`。

本轮独立短片包为 `economic-mathematics-prelude-film-v2.zip`，包含90秒完整版、15秒样片、原创配乐、动画源文件、可编辑预览和分镜。它按明确文件清单打包，避免将工作区同期新增的课程数字人功能混入短片交付；项目内的这些改动予以保留。

PDF是使用同一份内容重新排版的矢量备课版，并非网页截图。网页使用Noto CJK的WOFF子集；PDF使用Google Fonts同系列静态TrueType字形，均保留OFL许可。

## 验证边界

所有播放器依赖、字体、音轨、视频与PDF均在本地交付包内，没有CDN或登录依赖。MP4已经本地完整解码；本地HTTP资源入口已实际播放和浏览。浏览器自动安全审查禁止 `file:` 协议，因此未通过该工具验证“解压后双击HTML”的运行，不能把文件清单检查表述为这一项已实测。

实际投影亮度、音响音量、学生第一印象、45分钟互动节奏与教学效果，仍须通过教室设备和真实试讲验收。制作预算是备课起点，不是实证教学效果。

## 主要复现命令

```text
node scripts/economic-mathematics-prelude.mjs build
node scripts/economic-mathematics-prelude.mjs score
node scripts/economic-mathematics-prelude.mjs serve
```

浏览器访问本地输出地址并点击“导出逐帧视频”；使用同一渲染器生成的帧执行 `mux`、`verify` 和 `contact`。15秒样片在浏览器加 `sample=1`，命令加 `--sample`。

```text
python scripts/economic-mathematics-prelude-fonts.py --pdf-fonts
node scripts/economic-mathematics-prelude-docs.mjs
python scripts/economic-mathematics-prelude-pdf.py
pnpm --filter @edu/teacher-web exec tsx --test test/economic-mathematics-prelude.test.ts test/economic-mathematics-slides.test.tsx
pnpm --filter @edu/platform-api exec tsx --test test/course-context.test.ts test/economic-mathematics.test.ts
pnpm build
git diff --check
```

生成证据位于 `output/economic-mathematics/prelude-v1/`：媒体审计、音轨审计、源码指纹、备课时间表、PDF文本边界和静态联系表。

## 本机运行

已复用本机开发服务 http://localhost:5173 。直接入口为 `/course-assets/economic-mathematics/prelude/index.html?page=1`；平台API健康状态正常，HTTP提供的视频SHA256与新版成片一致。实际播放完整90秒后自动进入第2页。生产构建另行通过；短片相关14份构建文件与源资源校验一致。

## 2026-10-09 Git交付打包

为使完整短片能够作为普通仓库资源提交，原106,990,263字节成片保留于本地`output/economic-mathematics/prelude-v1/history/economic-mathematics-prelude-before-git-delivery.mp4`，发布副本为62,475,687字节。采用H.264 CRF19、slow预设与8Mbps最高视频码率；尺寸1920×1200、60fps、90秒与5400帧保持，AAC音频包直接复制并核对一致。完整解码通过；七个时间点的帧SSIM为0.993891–0.999630，57秒处原片与发布片作整幅视觉对照。压缩改变像素，不表述为无损。

动画源与数学几何关系保持；`mux`命令采用同样的发布编码预算，防止重新生成过大文件。两份离线包从当前资源重新打包并核对清单。详细的原片、发布片哈希、编码与样帧结果见`economic-mathematics-prelude-git-delivery.json`。当前讲次与新版第二讲接入见`economic-mathematics-course-order.md`，本节不把本地媒体检查扩大为实际课堂验收。
