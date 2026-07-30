# 教学页面概念图 ImageGen 提示词 v1

## 输入

- `system-entry-concept-v1.png`：仅作为“教学中枢”既有色彩、间距、圆角、中文产品感与港航助手语言的风格参考，不作为编辑目标。

## 最终提示词

```text
Use case: ui-mockup
Asset type: high-fidelity desktop teacher live-classroom console concept image, wide 16:9 application screenshot
Input images: Image 1 is a visual style reference only for the existing 教学中枢 product: retain its deep navy, maritime teal, clean white surfaces, restrained coral action color, Chinese education-product polish, spacing, rounded corners, and friendly original harbor-assistant character language. Do not edit Image 1 and do not copy its dashboard layout.
Primary request: design the live teaching page for 重庆交通大学 teacher 李行之 teaching the course 港口管理概论. The teaching content must be the unquestioned main stage and occupy about 78% of the usable body width. A compact digital-human assistant dock occupies about 22% on the right and can visibly be collapsed. This must look like a practical, shippable React web product, not concept art.
Composition/framing: full-screen desktop UI, clean 16:9 landscape. A slim 68px top command bar spans the page. No permanent wide sidebar. Below it, split the body into a very large left teaching stage and a narrow right assistant dock. The left area includes a small horizontal activity tab strip at the top, one huge slide canvas in the middle, and one compact control bar at the bottom. The right assistant dock is vertically structured and clearly secondary.
Top command bar: small 教学中枢 mark, course name 港口管理概论, chapter 第一章 港口与港口管理, red live indicator with 课堂进行中, class timer 00:26:18, 暂无学生在线 (this must be a real presence state, never a decorative count), subtle 邀请 and 设置 controls, and a coral 结束课堂 button.
Left teaching stage: activity tabs labeled Slides, 模拟实验, 白板, 视频, 互动, with Slides active. The slide itself is elegant and highly readable, titled 港口的基本构成, with a clean educational diagram showing 海域, 陆域, 港池, 泊位, 码头前沿, 堆场 connected around a simplified harbor plan, container ship and quay cranes; clear large Chinese labels, navy/teal/coral accents, generous whitespace. A small badge says 第 07 页. Do not make the slide look like a dashboard card; it is the large instructional canvas.
Bottom stage controls: 上一页, 当前页 07 / 32, 下一页, 指针, 批注, 学生互动, 全屏. Controls are compact and do not cover the slide.
Right digital-human dock: header 港航教学助手 with status LAM 实时数字人 and a visible 收起 control. The avatar panel is the real OpenAvatarChat LAM Barbara WebGL renderer, not an illustration or image placeholder. Below it show the actual connection state, current task 当前页：港口的基本构成, a two-line live subtitle preview, and the manual voice/text input. At the bottom show the measured OpenAvatarChat connection/version state and a 中断讲解 control; do not invent GPU state or latency.
Style/medium: high-fidelity realistic product UI mockup, crisp modern Chinese sans-serif typography, practical spacing, subtle borders and shadows, HTML/CSS-reproducible layout, accessible contrast. Keep the teaching stage bright and content-focused; keep the assistant dock slightly tinted pale teal.
Color palette: deep maritime navy #073750, teal #1BB2A8, off-white #F3F7F8, coral #EF765F, dark ink #17324A.
Text (verbatim where legible): 教学中枢; 港口管理概论; 第一章 港口与港口管理; 课堂进行中; 暂无学生在线; 结束课堂; Slides; 模拟实验; 白板; 视频; 互动; 港口的基本构成; 第 07 页; 当前页 07 / 32; 港航教学助手; LAM 实时数字人; 按住说话; 文字; 收起; OpenAvatarChat 已连接; 中断讲解.
Constraints: teaching content must visually dominate; digital human must remain under one quarter of the page; no wide sidebar; no decorative empty dashboard cards; no stock photos; no university logo; no unrelated brand marks; no browser chrome; no watermark. Avoid tiny illegible text, sci-fi HUD styling, 3D glassmorphism, excessive gradients, and an oversized avatar.
```

## 生成方式

使用内置 ImageGen 工具生成，未使用 CLI fallback。
