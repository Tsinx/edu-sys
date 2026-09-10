# 港口管理第二、三讲三维工艺动画验收

日期：2026-09-10。

本次升级 15 个工艺页。第二讲为第 14、15、18、22、23、25、29、30 页；第三讲为第 7、8、9、10、12、13、14 页。其他页面保留既有构图与地理动画。

三维模型在本机生成，不依赖外部图片或模型服务。集装箱波纹板、门锁与角件、船体、岸桥桁架、小车、吊索、车辆、管线与筒仓均为几何模型。所有动态状态由课件进度统一采样，暂停时不保留独立动画循环。相同材料的静态结构合并渲染，以降低绘制开销。

## 验证结果

- `scripts/port-process-browser-audit.mjs`：15 页各检查 0%、25%、50%、75%、100%，共 75 帧；每页暂停稳定、任意进度回放画面一致；无页面异常。
- 无 WebGL 的船闸、翻箱、煤炭、油品、滚装，以及吊装中失去 WebGL 上下文，均显示平面工艺示意。
- `scripts/port-lbl-autoplay-audit.mjs`：前 4999ms 保持初始帧，5000ms 后自动播放；切页取消旧计时；手动控制接管；结束停在本页。
- `scripts/verify-playback-controls-browser.mjs`：实际三维吊装页通过普通与全屏控制检查，包含 1600、1280、900、390px 宽度；切换全屏保留进度，返回页面重新开始。
- 两讲全部 106 页的桌面与 390px 浏览器巡检：图片、文字裁切、横向溢出及页面异常均为 0。闸口停车位置修正后另行复检。
- 学生画布与授课文案测试 9/9；课程上下文测试 9/9；工作区类型检查、生产构建、`git diff --check` 通过。
- PDF 抽检第二讲第 15、18 页和第三讲第 13 页：以 PNG 固定完整三维帧，保留标题与说明为文本；使用 Poppler 重渲染并检查，未发现空白画面或排版问题。这是抽检，未重新生成两讲整套 PDF 或离线 ZIP。
- 本机 Chromium SwiftShader 软件 WebGL、1600×1100 视口下，吊装连续运行 3 秒记录 63 次画面更新，约 21 fps。这是软件渲染环境的观测，非真实教室投影设备性能验收。

## 证据

- `output/port-process-qa/browser-check.json`：三维逐帧与回退结果。
- `output/port-process-qa/contact-1.jpg` 至 `contact-5.jpg`：75 帧联系表。
- `output/port-process-qa/performance.json`：软件 WebGL 连续播放采样。
- `output/port-lbl-qa/browser-check.json`、`narrow-browser-check.json`：全页布局检查。
- `output/port-lbl-qa/autoplay/browser-check.json`：延迟播放行为。
- `output/playback-controls-qa/browser-report.json`：课堂全屏控制。

上述设备与路径均为教学概念模型，不代表具名港口设备、工程参数、实际吊装方案或实时作业记录。船闸近侧墙剖开以显示水位；油品与 LNG 亮点表示管线内部流向。
