# 第11讲插图与开场短片验收

本文保存v17的历史验收。现行v19实拍纪实版见[新版验收](./port-management-documentary-v2-qa.md)；旧片对照入口为 `/course-assets/port-management/l11-media/legacy-index.html`。

2026-10-14。版本：`release-port-management-illustrated-v17`。32页、90分钟、30分钟实验；第一单元8分钟内播放3分钟开场片，剩余5分钟用于写假设和核查原始说明。

使用入口：

- [第11讲课件](http://127.0.0.1:5173/port-expansion-preview.html?lesson=11&page=1)，统一工具栏点击“播放开场片”。
- [独立播放器](http://127.0.0.1:5173/course-assets/port-management/l11-media/index.html)，可逐镜头定位、下载MP4或字幕。
- [第11讲插图版PDF](http://127.0.0.1:5173/handouts/port-illustrated-v17/port-management-lesson-11-v17-illustrated.pdf)。

14页配置场景图：1、2、3、5、7、8、9、18、22、24、26、27、30、32。新增港区全景、场桥与集卡、闸口、港外四幅图，复用岸侧和控制室两幅。使用内置image_gen工具，完整提示词在 `apps/teacher-web/public/course-assets/port-management/l11-media/prompts.json`，图像与来源哈希在 `asset-fingerprints.json`。图表、数字和场景标注均为可编辑代码。

画面注明“AI教学示意”；新加坡历史事实引用MPA 2024-05-30说明。该说明明确锚地当时未拥挤，通用场景不作为现场证据。片内教学分布、未完成样本与实验参数分别标记。

实际导出媒体：`opening.mp4`，180.000秒、1920×1200、30fps、5400帧、H.264/yuv420p；AAC立体声48kHz，中文旁白、画面字幕和原创合成音乐。35,759,389字节；SHA256：`f71069043bc86ee1ddaf370ccd29a932489fbbbcb56214779b847f2d6d63656e`。

`scripts/port-eleven-film.mjs verify`对成片完整解码通过，测得综合响度-16.18 LUFS、真峰值-4.36 dBTP。18段实际旁白均适配镜头时窗，最大时间压缩约1.154倍；每段原始声音波形均无静音或削波异常。另用实际语音识别抽查MPA数字、时间端点和结尾问题三段，1336万与8.8%等内容与原稿一致，见 `audio-audit.json`。动态源渲染180秒全部5400帧，每0.5秒核查文字边界，18镜头均有记录且无画布外文字。逐镜头图像和最终成片接触图保存在 `output/port-eleven-media/`。

`scripts/port-eleven-browser-audit.mjs`六项浏览器检查通过：

1. 教师点击播放实际MP4，声音开启，读到180秒和1920×1200。
2. 同步投影跟随时钟并静音；网页全屏、屏幕全屏保持同一个正在播放的视频元素。
3. 暂停、定位、从头重播、自然结束后的重播均可用；输入进度不触发空格播放快捷键。
4. 刷新恢复到暂停状态；离开第一页后停止媒体、移除本页控制。
5. 独立播放器实际播放和下载通过，390px无横向溢出。
6. 32页在1600px和390px逐页检查，图片全部加载，文字未越出1600×1000画布，学生页面无教师稿与隐含元数据。

浏览器报告 `output/port-eleven-media/browser/audit.json` 的运行/控制台错误与排版问题均为空。第30页两列表格已调整列宽，保留全部字段和图片。

插图PDF按8页分批导出，硬限制为10% CPU/1536MiB，峰值低于上限，完整资源记录见 `pdf-export.log`。32页、32个书签、嵌入中文字体，每页可提取文字至少204字，页面外文字为0。最终SHA256：`e3c1ab72f05abea23491a8675e1d49edbb069a6a78294bb59f3ebf06713a7920`。配图与图表分层保留，不把整页做成图片。最终PDF另存新文件名，避免旧讲义缓存。

检查记录：前端208项通过、API145项通过、整个工作区类型检查通过；生产Vite构建通过，存在既有大分块警告。学生文案与上下文检查通过。港口相关范围的 `git diff --check` 通过；全仓仍有先前的数学文档 `docs/course/economic-mathematics-limits-exercises.md:953` 空行提示，未改动该手工作业。

开发浏览器、文件解码和音频指标验证不替代真实教室的投影、扬声器、网络和90分钟节奏试讲。跟随学生端播放与权限由协议测试覆盖；本次真实浏览器验证使用课件预览及同步投影入口。
