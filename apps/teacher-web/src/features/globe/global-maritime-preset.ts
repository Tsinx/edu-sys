import type {
  GlobeCoordinate,
  GlobeLocation,
  GlobeShippingLanePath,
  GlobeShippingLaneTier
} from "./InteractiveEarthGlobe";

export interface GlobalMaritimeLocation extends GlobeLocation {
  role: string;
  note: string;
  source: "NGA WPI" | "corridor reference";
}

const DEFAULT_LABEL_IDS = new Set([
  "shanghai",
  "singapore",
  "rotterdam",
  "los-angeles-long-beach",
  "suez",
  "panama",
  "malacca",
  "hormuz"
]);

const port = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  role: string,
  note: string,
  source: GlobalMaritimeLocation["source"] = "NGA WPI"
): GlobalMaritimeLocation => ({
  id,
  name,
  latitude,
  longitude,
  kind: "port",
  role,
  note,
  source,
  showLabel: DEFAULT_LABEL_IDS.has(id),
  visibilityScope: "global"
});

const chokepoint = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  role: string,
  note: string
): GlobalMaritimeLocation => ({
  id,
  name,
  latitude,
  longitude,
  kind: "chokepoint",
  role,
  note,
  source: "corridor reference",
  showLabel: DEFAULT_LABEL_IDS.has(id),
  visibilityScope: "global"
});

export const GLOBAL_MARITIME_LOCATIONS: readonly GlobalMaritimeLocation[] =
  [
    port(
      "shanghai",
      "上海",
      31.216667,
      121.5,
      "东亚主干港",
      "连接中国沿海、跨太平洋与亚欧航路"
    ),
    port(
      "ningbo-zhoushan",
      "宁波舟山",
      29.883333,
      121.55,
      "东亚深水港群",
      "长江三角洲南翼的全球干线节点"
    ),
    port(
      "shenzhen",
      "深圳",
      22.583333,
      114.266667,
      "华南主干港",
      "以盐田港区坐标代表深圳港群"
    ),
    port(
      "busan",
      "釜山",
      35.1,
      129.033333,
      "东北亚转运港",
      "连接日韩沿海与跨太平洋主干"
    ),
    port(
      "singapore",
      "新加坡",
      1.2644,
      103.822,
      "全球转运枢纽",
      "马六甲海峡东端的洲际航路节点",
      "corridor reference"
    ),
    port(
      "port-klang",
      "巴生港",
      3,
      101.4,
      "马六甲门户港",
      "服务马来半岛与区域转运网络"
    ),
    port(
      "colombo",
      "科伦坡",
      6.95,
      79.85,
      "印度洋转运港",
      "位于东西向印度洋主干航路附近",
      "corridor reference"
    ),
    port(
      "jebel-ali",
      "杰贝阿里",
      25.01,
      55.06,
      "海湾枢纽港",
      "连接霍尔木兹海峡与中东腹地",
      "corridor reference"
    ),
    port(
      "rotterdam",
      "鹿特丹",
      51.9,
      4.483333,
      "欧洲门户港",
      "连接北海、莱茵河与欧洲腹地"
    ),
    port(
      "antwerp-bruges",
      "安特卫普—布鲁日",
      51.26,
      4.4,
      "北海港群",
      "斯海尔德河口与欧洲产业腹地节点",
      "corridor reference"
    ),
    port(
      "hamburg",
      "汉堡",
      53.55,
      9.933333,
      "北欧门户港",
      "经易北河连接北海航路与欧洲腹地"
    ),
    port(
      "piraeus",
      "比雷埃夫斯",
      37.942,
      23.6465,
      "地中海门户",
      "亚欧航路进入欧洲港口网络的重要节点",
      "corridor reference"
    ),
    port(
      "los-angeles-long-beach",
      "洛杉矶—长滩",
      33.75,
      -118.25,
      "北美太平洋门户",
      "跨太平洋集装箱主干的美西节点"
    ),
    port(
      "new-york-new-jersey",
      "纽约—新泽西",
      40.67,
      -74.05,
      "北美大西洋门户",
      "连接跨大西洋航路与美国东北部腹地",
      "corridor reference"
    ),
    port(
      "santos",
      "桑托斯",
      -23.95,
      -46.3,
      "南美大西洋门户",
      "巴西东南部主要远洋港口"
    ),
    port(
      "durban",
      "德班",
      -29.866667,
      31.066667,
      "南部非洲门户",
      "印度洋西部与南非腹地连接点"
    ),
    chokepoint(
      "malacca",
      "马六甲",
      2.5,
      101.2,
      "关键海峡",
      "印度洋与南海之间的主通道"
    ),
    chokepoint(
      "suez",
      "苏伊士",
      30.45,
      32.35,
      "关键运河",
      "地中海与红海之间的亚欧捷径"
    ),
    chokepoint(
      "panama",
      "巴拿马",
      9.08,
      -79.68,
      "关键运河",
      "太平洋与大西洋之间的洲际通道"
    ),
    chokepoint(
      "gibraltar",
      "直布罗陀",
      35.96,
      -5.61,
      "关键海峡",
      "地中海通往大西洋的出口"
    ),
    chokepoint(
      "dover",
      "多佛",
      51,
      1.4,
      "关键海峡",
      "英吉利海峡最窄处的高密度航路"
    ),
    chokepoint(
      "hormuz",
      "霍尔木兹",
      26.56,
      56.25,
      "关键海峡",
      "波斯湾通往阿拉伯海的出口"
    ),
    chokepoint(
      "bab-el-mandeb",
      "曼德海峡",
      12.58,
      43.33,
      "关键海峡",
      "红海通往亚丁湾的南部入口"
    ),
    chokepoint(
      "cape-good-hope",
      "好望角",
      -34.36,
      18.47,
      "绕航通道",
      "苏伊士受限时连接印度洋与大西洋的替代走廊"
    )
  ];

interface CompactShippingLaneData {
  pathCounts: {
    major: number;
    middle: number;
    minor: number;
    total: number;
  };
  paths: Array<{
    i: string;
    t: GlobeShippingLaneTier;
    p: Array<readonly [number, number]>;
  }>;
}

let shippingLanePromise:
  | Promise<readonly GlobeShippingLanePath[]>
  | undefined;

export function loadGlobalShippingLanes() {
  shippingLanePromise ??= import(
    "./data/global-shipping-lanes.json"
  ).then((module) => {
    const data =
      module.default as unknown as CompactShippingLaneData;
    return data.paths.map(
      (path): GlobeShippingLanePath => ({
        id: path.i,
        tier: path.t,
        points: path.p.map(([longitude, latitude]) => ({
          latitude,
          longitude
        }))
      })
    );
  });
  return shippingLanePromise;
}

export const GLOBAL_ROUTE_FOCUS: GlobeCoordinate = {
  latitude: 8,
  longitude: -18
};

export const FEATURED_ROUTE_FOCUS: GlobeCoordinate = {
  latitude: 20,
  longitude: 70
};
