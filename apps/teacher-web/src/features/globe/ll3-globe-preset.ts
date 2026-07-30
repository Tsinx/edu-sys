import type {
  GlobeCoordinate,
  GlobeLocation,
  GlobeRoute
} from "./InteractiveEarthGlobe";
import ll3MaritimeRouteData from "./data/ll3-maritime-routes.json";

export interface Ll3GlobeLocation extends GlobeLocation {
  role: string;
  note: string;
}

const LL3_LOCATION_DATA = [
  {
    id: "shanghai",
    name: "上海",
    latitude: 31.216667,
    longitude: 121.5,
    kind: "port",
    role: "亚洲货源门户",
    note: "OOCL 2023 港序的起点与终点"
  },
  {
    id: "xiamen",
    name: "厦门",
    latitude: 24.45,
    longitude: 118.066667,
    kind: "port",
    role: "亚洲挂港",
    note: "东亚沿海货源节点",
    showLabel: false
  },
  {
    id: "nansha",
    name: "南沙",
    latitude: 22.65,
    longitude: 113.65,
    kind: "port",
    role: "亚洲挂港",
    note: "珠江口港口节点",
    showLabel: false
  },
  {
    id: "hong-kong",
    name: "香港",
    latitude: 22.266667,
    longitude: 114.2,
    kind: "port",
    role: "亚洲挂港",
    note: "区域航运与服务节点",
    showLabel: false
  },
  {
    id: "yantian",
    name: "盐田",
    latitude: 22.583333,
    longitude: 114.266667,
    kind: "port",
    role: "亚洲挂港",
    note: "华南远洋集装箱节点",
    showLabel: false
  },
  {
    id: "cai-mep",
    name: "盖梅",
    latitude: 10.512,
    longitude: 107.016,
    kind: "port",
    role: "亚洲挂港",
    note: "越南南部深水港群",
    showLabel: false
  },
  {
    id: "singapore",
    name: "新加坡",
    latitude: 1.2644,
    longitude: 103.822,
    kind: "port",
    role: "全球转运枢纽",
    note: "亚洲段与远洋航段的连接节点"
  },
  {
    id: "suez",
    name: "苏伊士",
    latitude: 29.9668,
    longitude: 32.5498,
    kind: "chokepoint",
    role: "关键通道",
    note: "亚欧航段的容量约束点"
  },
  {
    id: "piraeus",
    name: "比雷埃夫斯",
    latitude: 37.942,
    longitude: 23.6465,
    kind: "port",
    role: "地中海门户",
    note: "亚欧服务进入欧洲港口网络的节点"
  },
  {
    id: "hamburg",
    name: "汉堡",
    latitude: 53.55,
    longitude: 9.933333,
    kind: "port",
    role: "北欧港口",
    note: "连接欧洲腹地的门户节点",
    showLabel: false
  },
  {
    id: "rotterdam",
    name: "鹿特丹",
    latitude: 51.9,
    longitude: 4.483333,
    kind: "port",
    role: "欧洲门户港",
    note: "连接北海、莱茵河与欧洲腹地"
  },
  {
    id: "zeebrugge",
    name: "泽布吕赫",
    latitude: 51.333333,
    longitude: 3.2,
    kind: "port",
    role: "北欧挂港",
    note: "北海沿岸港口节点",
    showLabel: false
  },
  {
    id: "valencia",
    name: "瓦伦西亚",
    latitude: 39.45,
    longitude: -0.316667,
    kind: "port",
    role: "地中海挂港",
    note: "欧洲段与返程服务节点",
    showLabel: false
  },
  {
    id: "abu-dhabi",
    name: "阿布扎比",
    latitude: 24.8117,
    longitude: 54.6506,
    kind: "port",
    role: "返程挂港",
    note: "连接海湾市场与亚洲返程航段",
    showLabel: false
  }
] as const;

export const LL3_GLOBE_LOCATIONS: readonly Ll3GlobeLocation[] =
  LL3_LOCATION_DATA.map((location) => ({
    ...location,
    visibilityScope: "featured"
  }));

interface Ll3CompactRouteData {
  routes: Array<{
    id: string;
    label: string;
    color: string;
    points: Array<readonly [number, number]>;
  }>;
}

const LL3_MARITIME_ROUTE_DATA =
  ll3MaritimeRouteData as unknown as Ll3CompactRouteData;

export const LL3_GLOBE_ROUTES: readonly GlobeRoute[] =
  LL3_MARITIME_ROUTE_DATA.routes.map((route) => ({
    id: route.id,
    label: route.label,
    color: route.color,
    animated: true,
    interpolation: "piecewise-geodesic",
    points: route.points.map(([longitude, latitude]) => ({
      latitude,
      longitude
    }))
  }));

export const LL3_DEFAULT_FOCUS: GlobeCoordinate = {
  latitude: 20,
  longitude: 70
};
