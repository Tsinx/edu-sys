# 教学页面概念图 ImageGen 提示词 v2

> 历史局部编辑提示词，仅记录手动收音框的设计过程；其中要求保留的卡通头像、
> GPU 状态和旧在线人数不属于当前实现验收标准。

## 输入

- `classroom-page-concept-v1.png`：完整编辑目标。
- 用户提供的按钮区域截图：用于指明需要替换的局部。

## 最终提示词

```text
Use case: precise-object-edit
Asset type: revised high-fidelity desktop teacher live-classroom UI concept
Input images: Image 1 is the full edit target. Image 2 is a supporting crop that identifies the exact two-button region to replace.
Primary request: change only the lower interaction-control area inside the right-side 港航教学助手 dock, specifically the region currently containing the large teal button “讲解当前页” and the outlined button “暂停讲解”. Replace those two buttons with a compact WeChat-like dual-mode teacher command composer for manual voice capture or typed text.
New control design: show voice mode as the active resting state. Add one small square keyboard-mode switch button on the left with a keyboard icon and accessible label “切换文字输入”. Next to it place one large rounded press-to-talk control with a microphone icon and the exact centered text “按住说话”. Under the control, include a subtle single-line instruction “松开发送 · 上滑取消”. Make it visually obvious that pressing and holding records audio. Add a small “语音” status pill or microphone state indicator, but keep the component compact. The keyboard button implies that tapping it replaces the press-to-talk control with a normal text input; do not show two full input boxes simultaneously.
Interaction intent: this is teacher-to-assistant input, not student chat. The teacher manually holds to record an instruction, releases to send, or switches to typed text. Do not add automatic listening, always-on microphone, or a large chat history.
Text (verbatim): “切换文字输入”; “按住说话”; “松开发送 · 上滑取消”. Preserve all other existing Chinese labels exactly.
Visual style: match the existing pale teal assistant dock, navy/teal product UI, border radii, shadows, spacing, icon weight, and Chinese typography. The new composer must look shippable and HTML/CSS-reproducible.
Critical invariants: preserve the entire top navigation, teaching activity tabs, port slide, diagram labels, bottom slide controls, right-side assistant header, avatar portrait, current-page state, transcript preview, collapse control, and bottom GPU status exactly as in Image 1. Preserve original canvas size and full-page composition. Change only the two-button interaction region identified by Image 2. Do not redesign the avatar, alter the teaching content, change proportions, crop the page, add a sidebar, add logos, or add a watermark.
```

## 生成方式

使用内置 ImageGen 工具进行局部编辑，未使用 CLI fallback。
