# Interactive Earth Globe

面向课程可视化的三维地球组件。除 `globe-preview.html` 隔离预览入口外，
它已接入第一讲的电影化证据追踪；课堂运行时只在首次进入地球仪活动时动态加载组件、
历史复原路线和全球航线，不增加 Slides 初始包体。

## 已实现能力

- 自然地图与行政地图可独立切换；行政模式包含世界国界、中国国界、省级界、
  重要岛点，以及南海断续线和东海有关线段。
- 航线专题提供 `"global"`（全球航线）和 `"featured"`（LL3 专题）两种模式。
- 全球航线提供 `"major"`、`"regional"`、`"all"` 三档密度，分别显示
  Major、Major + Middle、Major + Middle + Minor。
- 全球三个等级各自合并为一个 `BufferGeometry`；即使显示全部 1321 条路径，
  航线也只有三个 Three.js 绘制批次。
- GIS 航线采用逐段球面大圆插值。组件不会用跨控制点的 Catmull-Rom 曲线重塑
  原始海上路径；顶点固定在球体表面外侧并安全处理换日线。
- LL3 保留双色管线和流动光点，几何改为 SeaRoute 5 km 网络生成的密集折线。
- 全球 16 个港口城市和 8 个通道节点均可点击；默认只显示上海、新加坡、
  鹿特丹、洛杉矶—长滩、苏伊士、巴拿马、马六甲和霍尔木兹八个标签。
- 全球数据由预览页动态导入并传入组件，不进入主应用初始 JavaScript 包。
- 第一讲固定 cue 共七幕、约 90 秒；教师端推进权威步骤，学生端通过 SSE
  只读复现。LAM 离线时仍显示完整字幕。
- WebGL 失败或系统启用“减少动态效果”时，使用相同叙事顺序的平面地球降级画面。

## 文件边界

- `InteractiveEarthGlobe.tsx`：公共类型、交互状态、Three.js 场景和降级显示。
- `global-maritime-preset.ts`：全球核心节点、默认视角和动态航线加载器。
- `ll3-globe-preset.ts`：OOCL LL3 港序、港口说明和精细航线。
- `data/global-shipping-lanes.json`：压缩的全球 Major / Middle / Minor 路径。
- `data/ll3-maritime-routes.json`：SeaRoute 生成并经陆地相交检查的 LL3 路径。
- `data/opening-trade-route.json`：广州—马六甲—好望角—多佛—伦敦的开场路线复原。
- `data/shipping-lanes-audit.json`：来源哈希、数量、体积、陆地交叉和走廊门禁。
- `data/prc-administrative-boundaries.json`：行政地图边界数据。
- `GlobePreviewPage.tsx`：独立预览页和数据加载状态。
- `../classroom/ClassroomGlobeStage.tsx`：1600×1000 课堂电影舞台、字幕、
  LAM 逐幕讲解和教师/学生同步。
- `scripts/build-globe-shipping-data.mjs`：全球与 LL3 数据的可复现构建器。
- `scripts/build-globe-administrative-data.mjs`：行政边界数据构建器。

## 公共接口

```tsx
import {
  InteractiveEarthGlobe,
  type GlobeLocation,
  type GlobeRoute,
  type GlobeShippingLanePath
} from "./features/globe/InteractiveEarthGlobe";
import "./features/globe/interactive-earth-globe.css";

const locations: GlobeLocation[] = [
  {
    id: "shanghai",
    name: "上海",
    latitude: 31.216667,
    longitude: 121.5,
    visibilityScope: "all"
  }
];

const routes: GlobeRoute[] = [
  {
    id: "featured-route",
    label: "专题航线",
    interpolation: "piecewise-geodesic",
    points: [
      { latitude: 31.216667, longitude: 121.5 },
      { latitude: 1.2644, longitude: 103.822 }
    ]
  }
];

const shippingLanes: GlobeShippingLanePath[] = [
  {
    id: "major-001",
    tier: "major",
    points: [
      { latitude: 31.216667, longitude: 121.5 },
      { latitude: 1.2644, longitude: 103.822 }
    ]
  }
];

<InteractiveEarthGlobe
  locations={locations}
  routes={routes}
  shippingLanes={shippingLanes}
  defaultRouteView="global"
  defaultShippingLaneDetail="major"
  defaultMapMode="natural"
  defaultAdministrativeDetail="province"
  onRouteViewChange={(view) => console.log(view)}
  onShippingLaneDetailChange={(detail) => console.log(detail)}
/>;
```

`routeView` / `defaultRouteView` 与
`shippingLaneDetail` / `defaultShippingLaneDetail` 都支持受控和非受控模式。
`mapMode`、`administrativeDetail` 也保留相同模式。父级可通过
`InteractiveEarthGlobeHandle` 调用 `focusLocation`、`focusCoordinate`、
`resetView`、`zoomIn` 和 `zoomOut`。

切换全球航线时会暂停自动旋转并回到全球视角；切换 LL3 时聚焦亚欧走廊。
地点通过 `visibilityScope: "all" | "global" | "featured"` 控制可见范围，
模式切换只改变场景对象可见性，不销毁并重建整个 Three.js 场景。

## 航线来源与生成

全球几何固定使用
[Global Shipping Lanes v1.3.1](https://github.com/newzealandpaul/Shipping-Lanes/tree/v1.3.1)，
提交 `3c61a2000456599b6a2d9ecb7bd1db1221cd562d`，源 GeoJSON SHA-256 为
`4cf32597001bf8543790f4d39bcadb90b3a1069c98a6c437dc8287e3e8334d6e`。
署名保留为 P. Benden 与 Central Intelligence Agency；上游采用定制
CC BY-SA 4.0，并明确包含 Statista 排除条款。
源文件是按等级组织的三个 `MultiLineString`，包含 52 / 123 / 64 个原始部分；
构建器修复、清理并按连续折线确定性切分成前端要求的 122 / 788 / 411 条
渲染路径。这里的“路径数”是前端可审计的渲染分段数，不虚称为 1321 条独立
班轮服务。

LL3 使用
[Eurostat SeaRoute](https://eurostat.github.io/searoute/) 的 5 km Marnet 网络
逐港求海路，港序固定为
[OOCL 2023 年 8 月公布的 84 天 LL3 环线](https://www.oocl.com/eng/pressandmedia/pressreleases/2023/Pages/08Aug2023.aspx?lang=eng)。
连续岸线误差通过近海绕行点修正，但保留原始港序。港口城市坐标优先按
[NGA World Port Index](https://msi.nga.mil/Publications/WPI) 整理；只定位到
城市或港群级别，不表达码头、泊位或实时船舶位置。
SeaRoute 软件采用 EUPL 1.2；Natural Earth 数据属于公共领域。

陆地检查固定使用
[Natural Earth 1:10m Land v5.1.2](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/)；
每段以不超过 0.08° 的步长采样。除苏伊士、巴拿马和清单中明确列出的港口航道
包络外，非通航陆地相交数必须为零，否则生成失败。

[世界银行 2015–2021 AIS 商船密度](https://datacatalog.worldbank.org/search/dataset/0037580/global-shipping-traffic-density)
仅作为外部走廊核对来源。构建器会对亚欧、跨太平洋、跨大西洋、霍尔木兹、
巴拿马和好望角六类走廊执行关键锚点距离门禁，并从
[Esri Oceans 发布的同源 World Bank/IMF 商船密度影像服务](https://www.arcgis.com/home/item.html?id=d2c77a93295e4ac4883103b60047db2f)
读取 0.005° LERC 栅格瓦片。在每类走廊的一处真实航线顶点周围，审计会解码
0.1° 窗口、记录像元统计与瓦片 SHA-256，并要求第 95 百分位通过门限。
458.1 MB 的完整 ZIP 不进入仓库，瓦片也不进入前端包；这种有界抽样用于走廊
核对，不是完整栅格覆盖率分析或导航验证。前端公开说明“非实时 AIS、非导航
航迹”。

重新生成需要 Java 9 或更高版本。先下载 SeaRoute release，并将
`--searoute-dir` 指向同时包含
`searoute.jar` 和 `marnet/marnet_plus_5km.gpkg` 的目录：

```powershell
pnpm --filter @edu/teacher-web globe:data -- `
  --searoute-dir "D:\data\searoute\release\searoute"
```

也可以设置 `SEAROUTE_HOME`。构建器会下载其余固定源、校验所有输入哈希，
输出两份压缩 JSON 和审计清单，并强制全球前端数据小于 1.5 MB。重复本地构建
时可设置 `GLOBE_REUSE_SEAROUTE_OUTPUT=1` 复用已经校验的 SeaRoute 中间结果。
如果航线几何没有变化，只需刷新在线 AIS 瓦片审计，可运行：

```powershell
pnpm --filter @edu/teacher-web globe:data -- --ais-only
```

只重新生成第一讲历史复原路线时，可运行：

```powershell
node scripts/build-globe-shipping-data.mjs --opening-only `
  --searoute-dir "D:\data\searoute\release\searoute"
```

开场路线固定经过广州港区、马六甲、好望角、多佛和伦敦。构建器对路线执行同一套
Natural Earth 1:10m 陆地相交检查，并只对港口航道和泰晤士河—伦敦段应用明确的
通航例外。该路线始终公开标记为“路线复原”，不代表某批丝织品的完整历史轨迹。

## 行政地图边界

中国国界、省级界、海岸线、重要岛点以及南海断续线来自
[自然资源部标准地图服务系统](http://bzdt.ch.mnr.gov.cn/)公开的自助制图
TopoJSON 图层；全球行政界线也取自同一服务。中国平面数据按服务使用的
Krasovsky 1940 双标准纬线等积圆锥投影反算为经纬度。

内容表示遵循自然资源部
[《公开地图内容表示规范》（自然资规〔2023〕2号）](https://www.fmprc.gov.cn/web/wjb_673085/zzjg_673183/bjhysws_674671/bhflfg/dtdmxgfl/202303/P020230313585504979937.pdf)。
“南海断续线及东海有关线段”不会被误写成一般意义的领海基线或领海外部界限。
该图层是三维教学可视化，不等同于原始标准地图，也不替代地图审核；对外公开
发布或作为正式地图使用前，仍应按现行规定履行地图审核。

重新生成行政数据：

```powershell
node scripts/build-globe-administrative-data.mjs
```

## 地球影像

底图来自 NASA Earth Observatory
[Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/)。
仓库内版本由官方 5400×2700 JPEG 等比缩小为 2048×1024 WebP，SHA-256 为
`A31E4C4A6FCCED1C3D078D56B2D165790CA96E130E8ADE2328A682775DE5A460`。
WebGL 或纹理加载失败时，组件保留平面降级内容。
