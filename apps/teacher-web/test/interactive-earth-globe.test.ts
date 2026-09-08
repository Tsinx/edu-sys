import assert from "node:assert/strict";
import { statSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  InteractiveEarthGlobe,
  type GlobeLocation,
  type GlobeRoute
} from "../src/features/globe/InteractiveEarthGlobe.js";
import {
  LL3_GLOBE_LOCATIONS,
  LL3_GLOBE_ROUTES
} from "../src/features/globe/ll3-globe-preset.js";
import administrativeBoundaryData from "../src/features/globe/data/prc-administrative-boundaries.json";
import globalShippingLaneData from "../src/features/globe/data/global-shipping-lanes.json";
import ll3MaritimeRouteData from "../src/features/globe/data/ll3-maritime-routes.json";
import openingTradeRouteData from "../src/features/globe/data/opening-trade-route.json";
import shippingLaneAudit from "../src/features/globe/data/shipping-lanes-audit.json";
import { GLOBAL_MARITIME_LOCATIONS } from "../src/features/globe/global-maritime-preset.js";

function geographicDistanceKm(
  left: readonly number[],
  right: readonly number[]
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitude1 = toRadians(left[1] ?? 0);
  const latitude2 = toRadians(right[1] ?? 0);
  const deltaLatitude = latitude2 - latitude1;
  let deltaLongitude = (right[0] ?? 0) - (left[0] ?? 0);
  if (deltaLongitude > 180) deltaLongitude -= 360;
  if (deltaLongitude < -180) deltaLongitude += 360;
  const deltaLongitudeRadians = toRadians(deltaLongitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitudeRadians / 2) ** 2;
  return (
    2 *
    6371.0088 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function nearestAnchorIndex(
  points: readonly (readonly number[])[],
  anchor: readonly [number, number],
  maximumDistanceKm: number,
  label: string
) {
  let nearestIndex = -1;
  let nearestDistanceKm = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distanceKm = geographicDistanceKm(point, anchor);
    if (distanceKm < nearestDistanceKm) {
      nearestDistanceKm = distanceKm;
      nearestIndex = index;
    }
  });
  assert.ok(
    nearestDistanceKm <= maximumDistanceKm,
    `${label} is ${Math.round(nearestDistanceKm)} km from the LL3 path`
  );
  return nearestIndex;
}

test("globe renders an accessible loading shell without browser globals", () => {
  const markup = renderToStaticMarkup(
    createElement(InteractiveEarthGlobe, {
      locations: LL3_GLOBE_LOCATIONS,
      routes: LL3_GLOBE_ROUTES,
      ariaLabel: "课程三维地球仪"
    })
  );

  assert.match(markup, /role="region"/u);
  assert.match(markup, /aria-label="课程三维地球仪"/u);
  assert.match(markup, /正在加载地球底图/u);
  assert.match(markup, /aria-label="放大地球"/u);
  assert.match(markup, /aria-label="缩小地球"/u);
  assert.match(markup, /自然地图/u);
  assert.match(markup, /行政地图/u);
  assert.match(markup, /全球航线/u);
  assert.match(markup, /LL3 专题/u);
  assert.match(markup, /非实时 AIS、非导航航迹/u);
  assert.match(markup, /NASA Blue Marble/u);
  assert.doesNotMatch(markup, /teachingCue|assistantCue|让学生/u);
});

test("globe exposes a declarative moving vessel and camera-follow contract", () => {
  const markup = renderToStaticMarkup(
    createElement(InteractiveEarthGlobe, {
      movingVessel: {
        id: "canton-silk-vessel",
        coordinate: { latitude: 22.65, longitude: 113.65 },
        headingTo: { latitude: 2.5, longitude: 101.45 },
        progress: 0.18
      },
      cameraTrackingCoordinate: {
        latitude: 22.65,
        longitude: 113.65
      }
    })
  );

  assert.match(markup, /data-moving-vessel="canton-silk-vessel"/u);
  assert.match(markup, /data-camera-tracking="true"/u);
});

test("opening trade route uses fixed waypoints and passes land QA", () => {
  assert.equal(openingTradeRouteData.schemaVersion, 1);
  assert.deepEqual(
    openingTradeRouteData.forcedWaypoints.map((point) => point.id),
    ["canton", "malacca", "cape-good-hope", "dover", "london"]
  );
  assert.match(openingTradeRouteData.disclaimer, /路线示意/u);
  assert.match(openingTradeRouteData.disclaimer, /不代表某一批丝绸/u);
  assert.equal(openingTradeRouteData.audit.pass, true);
  assert.equal(
    openingTradeRouteData.audit.nonNavigableLandIntersections,
    0
  );
  assert.ok(openingTradeRouteData.route.points.length > 200);

  const points = openingTradeRouteData.route.points;
  const malaccaIndex = nearestAnchorIndex(
    points,
    [101.45, 2.5],
    5,
    "Malacca"
  );
  const capeIndex = nearestAnchorIndex(
    points,
    [18.47, -34.36],
    5,
    "Cape of Good Hope"
  );
  const doverIndex = nearestAnchorIndex(
    points,
    [1.35, 51.05],
    5,
    "Dover"
  );
  assert.ok(malaccaIndex < capeIndex);
  assert.ok(capeIndex < doverIndex);
});

test("administrative mode exposes PRC-standard boundary choices", () => {
  const markup = renderToStaticMarkup(
    createElement(InteractiveEarthGlobe, {
      defaultMapMode: "administrative",
      defaultAdministrativeDetail: "province"
    })
  );

  assert.match(markup, /data-map-mode="administrative"/u);
  assert.match(markup, /aria-label="行政边界层级"/u);
  assert.match(markup, /aria-label="聚焦中国全图"/u);
  assert.match(markup, /聚焦中国/u);
  assert.match(markup, /中国国界与海岸线/u);
  assert.match(markup, /中国省级界线/u);
  assert.match(markup, /南海断续线及东海有关线段/u);
  assert.match(markup, /PRC 标准地图依据/u);
  assert.match(markup, /自然资源部标准地图服务/u);
  assert.match(markup, /不替代地图审核/u);
  assert.doesNotMatch(markup, /领海边界/u);
});

test("administrative boundary package is complete and geographically valid", () => {
  const pathCollections = [
    administrativeBoundaryData.worldBoundaries,
    administrativeBoundaryData.prcNationalBoundaries,
    administrativeBoundaryData.prcProvinceBoundaries,
    administrativeBoundaryData.southChinaSeaDashes
  ];
  const coordinates = pathCollections.flat(2);

  assert.equal(administrativeBoundaryData.schemaVersion, 1);
  assert.match(
    administrativeBoundaryData.source.authority,
    /中华人民共和国自然资源部/u
  );
  assert.ok(administrativeBoundaryData.worldBoundaries.length > 500);
  assert.ok(
    administrativeBoundaryData.prcNationalBoundaries.length >= 20
  );
  assert.ok(
    administrativeBoundaryData.prcProvinceBoundaries.length >= 60
  );
  assert.equal(
    administrativeBoundaryData.southChinaSeaDashes.length,
    10
  );
  assert.equal(
    administrativeBoundaryData.importantIslandPoints.length,
    39
  );
  assert.ok(
    coordinates.every(
      ([longitude, latitude]) =>
        Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90
    )
  );
});

test("LL3 preset uses valid geographic coordinates and route points", () => {
  const coordinateIsValid = (coordinate: {
    latitude: number;
    longitude: number;
  }) =>
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180;

  assert.ok(LL3_GLOBE_LOCATIONS.length >= 10);
  assert.equal(
    new Set(LL3_GLOBE_LOCATIONS.map((location) => location.id)).size,
    LL3_GLOBE_LOCATIONS.length
  );
  assert.ok(LL3_GLOBE_LOCATIONS.every(coordinateIsValid));
  assert.ok(
    LL3_GLOBE_ROUTES.every(
      (route) =>
        route.points.length >= 2 &&
        route.points.every(coordinateIsValid)
    )
  );
  assert.ok(
    LL3_GLOBE_ROUTES.every(
      (route) => route.interpolation === "piecewise-geodesic"
    )
  );
  assert.deepEqual(ll3MaritimeRouteData.officialPortSequence, [
    "shanghai",
    "xiamen",
    "nansha",
    "hong-kong",
    "yantian",
    "cai-mep",
    "singapore",
    "piraeus",
    "hamburg",
    "rotterdam",
    "zeebrugge",
    "valencia",
    "piraeus",
    "abu-dhabi",
    "singapore",
    "shanghai"
  ]);
  assert.equal(
    ll3MaritimeRouteData.source.portSequence.url,
    "https://www.oocl.com/eng/pressandmedia/pressreleases/2023/Pages/08Aug2023.aspx?lang=eng"
  );
  assert.equal(
    ll3MaritimeRouteData.source.portSequence.roundTripDays,
    84
  );
  assert.equal(
    shippingLaneAudit.ll3.nonNavigableLandIntersections,
    0
  );
});

test("LL3 maritime vertices traverse required chokepoints in route order", () => {
  const westbound = ll3MaritimeRouteData.routes.find(
    (route) => route.id === "ll3-westbound"
  );
  const eastbound = ll3MaritimeRouteData.routes.find(
    (route) => route.id === "ll3-eastbound"
  );
  assert.ok(westbound);
  assert.ok(eastbound);

  const westboundIndices = [
    nearestAnchorIndex(
      westbound.points,
      [101.2, 2.5],
      40,
      "Malacca"
    ),
    nearestAnchorIndex(
      westbound.points,
      [43.33, 12.58],
      40,
      "Bab-el-Mandeb"
    ),
    nearestAnchorIndex(
      westbound.points,
      [32.35, 30.45],
      40,
      "Suez"
    ),
    nearestAnchorIndex(
      westbound.points,
      [-5.61, 35.96],
      40,
      "Gibraltar"
    ),
    nearestAnchorIndex(
      westbound.points,
      [1.4, 51.06],
      40,
      "Dover"
    )
  ];
  assert.deepEqual(
    [...westboundIndices].sort((left, right) => left - right),
    westboundIndices
  );

  const eastboundIndices = [
    nearestAnchorIndex(
      eastbound.points,
      [32.35, 30.45],
      40,
      "Suez"
    ),
    nearestAnchorIndex(
      eastbound.points,
      [43.33, 12.58],
      40,
      "Bab-el-Mandeb"
    ),
    nearestAnchorIndex(
      eastbound.points,
      [56.25, 26.56],
      75,
      "Hormuz"
    ),
    nearestAnchorIndex(
      eastbound.points,
      [101.2, 2.5],
      40,
      "Malacca"
    )
  ];
  assert.deepEqual(
    [...eastboundIndices].sort((left, right) => left - right),
    eastboundIndices
  );
});

test("global shipping package preserves pinned source, tiers, and audit gates", () => {
  assert.equal(globalShippingLaneData.schemaVersion, 1);
  assert.equal(
    globalShippingLaneData.source.version,
    "v1.3.1"
  );
  assert.equal(
    globalShippingLaneData.source.commit,
    "3c61a2000456599b6a2d9ecb7bd1db1221cd562d"
  );
  assert.match(
    globalShippingLaneData.source.license,
    /CC BY-SA 4\.0/u
  );
  assert.equal(globalShippingLaneData.pathCounts.major, 122);
  assert.equal(globalShippingLaneData.pathCounts.middle, 788);
  assert.equal(globalShippingLaneData.pathCounts.minor, 411);
  assert.equal(globalShippingLaneData.pathCounts.total, 1321);
  assert.equal(
    shippingLaneAudit.global.nonNavigableLandIntersections,
    0
  );
  assert.equal(shippingLaneAudit.aisCorridorQa.pass, true);
  assert.deepEqual(
    shippingLaneAudit.aisCorridorQa.corridors.map(
      (corridor) => corridor.id
    ),
    [
      "asia-europe",
      "trans-pacific",
      "trans-atlantic",
      "hormuz",
      "panama",
      "cape-good-hope"
    ]
  );
  assert.ok(
    shippingLaneAudit.aisCorridorQa.corridors.every(
      (corridor) =>
        corridor.pass &&
        corridor.anchors.every((anchor) => anchor.pass)
    )
  );
  assert.equal(shippingLaneAudit.aisCorridorQa.raster.pass, true);
  assert.equal(
    shippingLaneAudit.aisCorridorQa.raster.source.serviceItemId,
    "d2c77a93295e4ac4883103b60047db2f"
  );
  assert.deepEqual(
    shippingLaneAudit.aisCorridorQa.raster.corridors.map(
      (corridor) => corridor.id
    ),
    [
      "asia-europe",
      "trans-pacific",
      "trans-atlantic",
      "hormuz",
      "panama",
      "cape-good-hope"
    ]
  );
  assert.ok(
    shippingLaneAudit.aisCorridorQa.raster.corridors.every(
      (corridor) =>
        corridor.pass &&
        corridor.nearestLaneDistanceKm <= 1 &&
        corridor.sampleWindow.percentile95 >= 1_000 &&
        /^[0-9a-f]{64}$/u.test(corridor.tile.sha256)
    )
  );
  assert.equal(
    shippingLaneAudit.global.pathCounts.total,
    globalShippingLaneData.paths.length
  );
  assert.ok(
    globalShippingLaneData.paths.every(
      (path) =>
        path.p.length >= 2 &&
        path.p.every(
          ([longitude, latitude]) =>
            Number.isFinite(longitude) &&
            Number.isFinite(latitude) &&
            longitude >= -180 &&
            longitude <= 180 &&
            latitude >= -90 &&
            latitude <= 90
        )
    )
  );
  assert.ok(
    globalShippingLaneData.paths.every((path) =>
      path.p.slice(1).every(
        (point, index) =>
          geographicDistanceKm(path.p[index] ?? point, point) <
          9_000
      )
    )
  );
  assert.ok(
    globalShippingLaneData.paths.some((path) =>
      path.p.some(([longitude]) => longitude > 170)
    )
  );
  assert.ok(
    globalShippingLaneData.paths.some((path) =>
      path.p.some(([longitude]) => longitude < -170)
    )
  );
  assert.ok(
    statSync(
      new URL(
        "../src/features/globe/data/global-shipping-lanes.json",
        import.meta.url
      )
    ).size <= 1_500_000
  );
});

test("global maritime preset exposes sixteen ports and eight chokepoints", () => {
  assert.equal(GLOBAL_MARITIME_LOCATIONS.length, 24);
  assert.equal(
    GLOBAL_MARITIME_LOCATIONS.filter(
      (location) => location.kind === "port"
    ).length,
    16
  );
  assert.equal(
    GLOBAL_MARITIME_LOCATIONS.filter(
      (location) => location.kind === "chokepoint"
    ).length,
    8
  );
  assert.deepEqual(
    GLOBAL_MARITIME_LOCATIONS.filter(
      (location) => location.showLabel
    )
      .map((location) => location.id)
      .sort(),
    [
      "hormuz",
      "los-angeles-long-beach",
      "malacca",
      "panama",
      "rotterdam",
      "shanghai",
      "singapore",
      "suez"
    ]
  );
  assert.ok(
    GLOBAL_MARITIME_LOCATIONS.every(
      (location) => location.visibilityScope === "global"
    )
  );
});

test("route view and density support controlled rendering and failure fallback", () => {
  const featuredMarkup = renderToStaticMarkup(
    createElement(InteractiveEarthGlobe, {
      routeView: "featured",
      shippingLaneDetail: "all",
      shippingLaneState: "ready"
    })
  );
  assert.match(featuredMarkup, /data-route-view="featured"/u);
  assert.match(
    featuredMarkup,
    /data-shipping-lane-detail="all"/u
  );
  assert.match(featuredMarkup, /OOCL 2023 港序/u);

  const failureMarkup = renderToStaticMarkup(
    createElement(InteractiveEarthGlobe, {
      shippingLaneState: "error"
    })
  );
  assert.match(failureMarkup, /全球数据加载失败/u);
  assert.match(failureMarkup, /节点仍可交互/u);
  assert.doesNotMatch(
    failureMarkup,
    /teachingCue|assistantCue|storyBeat|voyageStage/u
  );
});

test("all global tiers are represented by at most three scene batches", () => {
  const samplePaths = [
    {
      id: "major",
      tier: "major" as const,
      points: [
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 1 }
      ]
    },
    {
      id: "middle",
      tier: "middle" as const,
      points: [
        { latitude: 1, longitude: 1 },
        { latitude: 2, longitude: 2 }
      ]
    },
    {
      id: "minor",
      tier: "minor" as const,
      points: [
        { latitude: 2, longitude: 2 },
        { latitude: 3, longitude: 3 }
      ]
    }
  ];
  const markup = renderToStaticMarkup(
    createElement(InteractiveEarthGlobe, {
      shippingLanes: samplePaths
    })
  );
  assert.match(markup, /data-shipping-lane-batches="3"/u);
});

test("component accepts course-independent location and route data", () => {
  const locations: GlobeLocation[] = [
    {
      id: "custom",
      name: "自定义节点",
      latitude: 0,
      longitude: 0
    }
  ];
  const routes: GlobeRoute[] = [
    {
      id: "custom-route",
      label: "自定义路径",
      points: [
        { latitude: 0, longitude: 0 },
        { latitude: 10, longitude: 20 }
      ]
    }
  ];
  const markup = renderToStaticMarkup(
    createElement(InteractiveEarthGlobe, {
      locations,
      routes,
      title: "独立地球仪",
      showRouteModeToggle: false
    })
  );

  assert.match(markup, /独立地球仪/u);
  assert.doesNotMatch(markup, /LL3/u);
});
