# 小麦老师 P0 动画

后续更新：左右转头已升级为 Blender 辅助的二维烘焙版本，并增加 P1/P2 姿态与组合；当前版本和跳过项目见 [立体辅助转头与动作交付](xiaomai-head-proxy-delivery.md)。以下保留首轮 P0 的制作记录。

本版接入共享 Live2D 播放器，覆盖课堂与课下学习。预览入口为 `/avatar/xiaomai/preview`，可单独选择动作、课堂状态和无声口型示范。预览不修改已选角色；课堂沿用原有音色、身份与“小麦老师”唤醒词。

## 完成范围

| 项目 | 行为 |
| --- | --- |
| 自然眨眼 | 连续闭合、半睁、轻闭；移动眼睑，保留虹膜形状，没有开闭眼透明度叠影 |
| 视线 | 左、右、上、下及回正；虹膜区域移动，眼白连续采样，眼角固定 |
| 眉毛 | 抬眉、皱眉、内眉抬起、单侧挑眉；边界和跨层发丝固定 |
| 连续口型 | 宽窄、开合、圆唇、牙齿、舌头；微笑和收起笑容；大开口保留连续下唇 |
| 语音同步 | 沿用真实 PCM 的 A–H/X 分类和播放时钟，静音与打断闭嘴 |
| 左右转头 | 限幅的小幅回转，脸、耳、眼、鼻、口共同跟随 |
| 点头、抬低头 | 确认点头、抬头、低头及讲解中的轻微强调；打断不触发完成点头 |
| 歪头 | 左右轻微倾斜后平滑回正 |
| 呼吸 | 约 5.6 秒周期，胸肩微动，身体底部固定 |
| 头发跟随 | 阻尼弹簧延迟，固定面部交界、摆动自由发梢，限制最大摆幅 |

自动状态为待机、聆听、思考、讲解和确认完成。隐藏页面和折叠数字人停止绘制；减少动态效果模式关闭装饰动作，但实际语音口型继续工作。

## 工程边界

这是 **Cubism 模型加教学系统运行时绑定**，不是新增全部原生参数的 `.moc3` 导出。原始 `.cmo3`、`.psd` 和 `.moc3` 保留，模型仍只有三项实际关键形绑定；原始 `.moc3` 单独放进其他播放器不会得到本页全部动作。

`xiaomai-rig.ts` 细分原有 27 个网格，在 Cubism 渲染器读取顶点时提供变形坐标。SDK 和 Core 二进制不变。`xiaomai-motion.ts` 保存参数范围、平滑和头发物理；`xiaomai-mouth.ts` 保存连续嘴型。

`xiaomai-eyes.ts` 复用原始眼部位图。正视静止时逐像素复制；眨眼时移动眼睑和睫毛，虹膜保留尺寸并被遮挡。视线使用连续重采样，避免独立椭圆拼接造成接缝。透明区域先补皮肤底色再采样，防止透明黑色产生折线。静态眼部不重复上传。

三个新增 PNG 均为已有原创图层原样复制：

- `EyeL_Full.png`：`artifacts/avatar/xiaomai/layered-a-v2/layers/19-eye-left.png`
- `EyeR_Full.png`：`artifacts/avatar/xiaomai/layered-a-v2/layers/20-eye-right.png`
- `EyeSkin.png`：`artifacts/avatar/xiaomai/cubism-trial-v1/import/occlusion_underpainting.png`

本版限于当前半身素材的小幅动作，没有制作侧面隐藏区域、手势或肢体动作。

## 验证

- `verify-xiaomai-eye-fidelity.mjs`：中性双眼原始像素对照；原模型与新眼部并排截图；正视、四向视线、半闭和闭眼三倍放大复查。
- `verify-xiaomai-eye-frames.mjs`：24 帧眨眼复查及运行指标。单次软件渲染采样约 56.7 FPS、脚本平均 2.26 ms/帧，不代表所有设备。
- `verify-xiaomai-p0.mjs`：22 个动作检查点、9 类口型及组合、减少动态效果、窄屏和两种取景。
- `verify-xiaomai-visemes.mjs`：音频时钟口型、静音、打断、切换形象和取景。
- `verify-live2d-browser.mjs`、`verify-live2d-classroom.mjs`：角色切换、真实课堂和课下布局、故障回退。

证据在 `output/live2d-qa/p0-eyes/`、`p0-v1/`、`p0-classroom/`、`p0-speech/`。资产由 `public/avatar/live2d/assets.json` 记录校验和。发布指当前本地教学系统及前端生产构建，不包含远端发布或 Git 推送。
