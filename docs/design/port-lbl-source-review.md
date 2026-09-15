# 第二、三讲来源与使用边界

复核日期：2026-09-09。逐页引用注册表为 `packages/course-content/src/port-lbl-sources.ts`，每页关联来源保存在 `port-lbl.ts`。学生画面保留简短出处，详细维护信息放在本说明。

| 内容 | 依据 | 课件中的使用方式 |
|---|---|---|
| 集装箱规格、订舱、交付与还箱 | Maersk 箱型资料、运输指南、Terms for Carriage 15.4 | 说明典型业务条件；C-01 订单与时间为教学情境，不是实际运单 |
| 装箱与核实总质量 | IMO/ILO/UNECE CTU Code、IMO VGM | 区分装箱、封志、核实总质量与装船条件 |
| 港口信息与交付条件 | World Bank Port Community Systems | 解释货物、作业和信息的衔接，不推定所有港口有相同系统 |
| 果园港与长江 | 重庆市交通运输委资料 | 真实地理与枢纽背景；背景图为 AI 教学场景 |
| 三峡船闸 | 三峡集团双线五级船闸资料 | 动画仅拆解单级闸室升降原理，页脚明确；不把它画成整个三峡船闸 |
| 2023 年 LL3 港序 | OOCL 2023-08-08 历史公告及项目已有港序档案 | 历史服务快照。本次公开页面直接读取未成功，以项目已有带来源的档案核对；不宣称它是当前班表 |
| 干散货、LNG、滚装码头 | 鹿特丹港务局、Gate terminal、Wallenius Wilhelmsen | 专业工艺与接口说明；工艺图是概念示意，不是工程施工或吊装方案 |
| 全球贸易与货物方向 | UNCTAD Review of Maritime Transport 2025、EIA 澳大利亚与 LNG 贸易资料 | 展示代表性联系，不表示每条线有当前直达服务，不用线宽暗示运量 |
| 红海风险 | UNCTAD《Navigating troubled waters》，2024-02-22 | 有年份的历史案例，解释航程与服务循环变化 |
| 巴拿马水资源约束 | 巴拿马运河管理局 A-54-2023 相关公告 | 常规 36、2023 年 12 月 22、2024-01-16 起 24 的历史口径；不作为今日限额 |
| 霍尔木兹地理与现实 | EIA chokepoints、IMO Middle East 专题 | 地理出口与通行条件分开；IMO 页面按 2026-09-09 检索快照标示，不自动刷新，也不推算固定价格变化 |
| 班轮、港口与网络组织 | Port Economics, Management and Policy | 概念组织框架；70/7 与 84/7 配船例为明确简化的课堂模型 |

## 地图与图像

地球与平面回退使用同一份 NASA Blue Marble Next Generation 底图。底图不是实时天气，也不是 AI 生成的地理信息。

- [NASA 原始资料页](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/)
- [2004 年 12 月地形与水深合成原图](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/december/world.topo.bathy.200412.3x21600x10800.jpg)
- 原图 21600×10800，经尺寸转换成为本地 8192×4096 WebP；SHA-256：`4a51643caac5f719a68b6c5f41f913f3d4cc8526315be8eaea73aaecdc57ffbe`。
- 资产记录见 `docs/design/port-lbl-geography-provenance.json`。

西行 LL3 地理线沿用项目已有 Eurostat SeaRoute 重建；其余方向逐条选点编写。所有教学船位和路径都不是实时 AIS、导航图或通行保证。太平洋方向以跨日期变更线的连续海域呈现。

14 张 ImageGen 图像已逐张查看，保留原始输出与 `port-lbl-image-provenance.json`。这些图像用于场景气氛与货类辨识，所有使用页保留 AI 教学示意标记。吊装、堆场、船闸与班期的关系由独立绘制的矢量工艺图承载。

## 教学设定

- C-01：普通工业零件、40 英尺干货箱，重庆—果园港—长江—上海—鹿特丹—杜伊斯堡附近客户。上海经堆场完成水水换装。
- 主线箱在沿途挂港时留船。第 37 页另设需要中转的旁支，不改变主线箱履历。
- 40 天时间账：移动 32、准备作业 3、等待 5；统计至货物交付，空箱归还另计。
- 错过周班：到达晚 14 小时、等待多 154 小时，使下一程出发晚 168 小时。
- 配船：`N = ceil(T/H)`，循环 70 天与 84 天、周班间隔 7 天对应 10 艘与 12 艘。增加 20% 是配船需求，不是运价涨幅。
