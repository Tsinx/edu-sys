# 第二、三讲地球仪闪烁与消失修复

日期：2026-09-11。范围：教师网页的共享地球仪，以及第二、三讲 LBL 地球仪页面。

## 诊断与修改

1. `LblGlobe` 每帧调用 `focusCoordinate(..., 0)`。原组件仍创建镜头 tween，计算 `(frameTime - startedAt) / duration`。当两个时间戳相同，结果为 `NaN`，导致这一帧的相机位置和矩阵无效。浏览器受控时钟通过真实 `focusCoordinate` API 复现了无效帧。现在零时长操作直接设置相机位置并同步控制器，不再执行除法。第一讲的航行跟随逻辑及正常时长的镜头过渡继续沿用原实现。
2. 第三讲第 19 页从东经 150° 跨日期线转向西经 160°。原插值经过 180° 后产生范围外经度，被共享地球仪拒绝，直到下一关键帧才恢复。修复将插值经度归一化到 `[-180, 180)`。修复前抽样偏差最高约 49.94°；同组修复后抽样偏差为 0°。
3. 第三讲第 17、20、26、28 页会随动画切换航线。直接更换 `routes` 触发 Three.js 场景与画布重建、纹理重新加载。现在这四页传入固定航线集合，通过原有 `visibleRouteIds` 切换显示。船位与平面回退地图仍使用当前选中的航线。浏览器检查确认每页切换并回到起点时只使用一个画布。
4. 全球航线异步加载完成也曾触发整个渲染器重建；第三讲第 1 页的完整播放检查记录到了两个画布。现在共享组件只替换航线图层并释放旧图层的几何与材质，保留地球纹理、相机和动画循环。

课件文案、来源标注、1600×1000 画布、播放时长与教师操作均保持原有定义。

## 可复验方法

`scripts/port-globe-browser-audit.mjs` 在测试浏览器中拦截 Vite 模块响应，在真实渲染循环处读取相机矩阵、船位与画布身份；诊断数据不会写入产品或学生 DOM。它验证同帧零时长聚焦、跨日期线定位、四页航线切换、播放/暂停/续播/重播、停止于终点，以及第一讲实际电影化组件的跟随行为。数值采样使用 0.5 倍像素比，另以 1 倍像素比检查生产构建的桌面及窄屏画面。

```powershell
pnpm --filter @edu/teacher-web dev --port 5173
node scripts/port-globe-browser-audit.mjs
```

只有在修复前的源码上运行 `--baseline` 才会得到原故障。已保存的故障证据为 `output/globe-repair-qa/baseline-boundaries.json`。

相关单元与课程审核：

```powershell
pnpm --filter @edu/teacher-web exec tsx --test test/interactive-earth-globe.test.ts test/voyage-motion.test.ts test/teaching-slides.test.ts
pnpm --filter @edu/platform-api exec tsx --test test/course-context.test.ts
pnpm build
git diff --check
```

生产构建在 `http://127.0.0.1:4173` 验证：

```powershell
$env:PORT_LBL_BASE_URL='http://127.0.0.1:4173'
node scripts/port-lbl-browser-audit.mjs --all --offline --hardware
node scripts/port-lbl-browser-audit.mjs --all --offline --hardware --narrow
node scripts/port-lbl-autoplay-audit.mjs
```

全课件审计等待图片加载完成后使用 Playwright 元素截图，避免将资源仍在加载的中间帧误判为损坏图片，也避免窄屏初次布局与手工截图坐标之间的竞争。默认仍可运行软件 WebGL 模式；本次完整课件截图使用 `--hardware`，允许浏览器使用系统默认图形后端。

## 验证记录

- 相关单元、学生端文案和课程上下文测试：33/33 通过。
- 全仓库类型检查及生产构建通过。
- 一秒自动播放、教师接管、暂停、投影键盘控制及终点停止检查通过。
- 四段完整播放及第一讲实际组件的回归共采样 5,238 帧，无无效相机矩阵，无浏览器错误或 WebGL 上下文丢失；四段播放各自始终保留一张画布。报告：`output/globe-repair-qa/browser-check.json`，`verified: true`。
- 同帧聚焦、日期线 7 个位置、四个航线比较页面的切换检查通过；每个比较页面只使用一张画布。
- 生产构建桌面 1600×1100、窄屏 390×844 各完成 106 页检查，共 212 页次；无破图、文字裁切、横向溢出、请求失败或外部请求。报告：`output/globe-repair-qa/production-desktop.json` 和 `production-narrow.json`。
- 禁用 WebGL 的 10 个平面地图回退案例通过，浏览器错误为 0。报告：`output/globe-repair-qa/fallback-check.json`。
- 已人工复核第二讲航行、第三讲全球网络、目的地切换、跨太平洋、霍尔木兹及第一讲电影化地球仪的截图。
- `git diff --check` 通过。

本次修改保留在本地工作区。
