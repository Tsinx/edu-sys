import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as Lerc from "lerc";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const outputDirectory = resolve(
  repositoryRoot,
  "apps/teacher-web/src/features/globe/data"
);

const SHIPPING_SOURCE = {
  name: "Global Shipping Lanes v1.3.1",
  url: "https://raw.githubusercontent.com/newzealandpaul/Shipping-Lanes/v1.3.1/data/Shipping_Lanes_v1.geojson",
  repository:
    "https://github.com/newzealandpaul/Shipping-Lanes/tree/v1.3.1",
  version: "v1.3.1",
  commit: "3c61a2000456599b6a2d9ecb7bd1db1221cd562d",
  sha256:
    "4cf32597001bf8543790f4d39bcadb90b3a1069c98a6c437dc8287e3e8334d6e",
  observationYear: 2012,
  vectorReleaseYear: 2022,
  attribution: "P. Benden and Central Intelligence Agency",
  license:
    "custom CC BY-SA 4.0, with the upstream Statista exclusion"
};

const LAND_SOURCE = {
  name: "Natural Earth 1:10m Land",
  url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_land.geojson",
  version: "v5.1.2",
  sha256:
    "1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416"
};

const SEAROUTE_SOURCE = {
  name: "Eurostat SeaRoute 5 km Marnet",
  repository: "https://github.com/eurostat/searoute",
  release:
    "https://github.com/eurostat/searoute/raw/master/modules/jar/release/searoute.zip",
  jarSha256:
    "146b5fff173069e0098a589d8b58dca906d73b8d23b27b8406d7e3334bd773a4",
  networkSha256:
    "75ca6cc130b3748f568196a9caf62889e9f096ec358f65223b4095ac070be0e7",
  resolutionKm: 5
};

const OOCL_LL3_SOURCE = {
  name: "OOCL LL3 port rotation",
  url: "https://www.oocl.com/eng/pressandmedia/pressreleases/2023/Pages/08Aug2023.aspx?lang=eng",
  publicationDate: "2023-08-08",
  roundTripDays: 84
};

const WORLD_BANK_AIS_SOURCE = {
  name: "Global Shipping Traffic Density",
  url: "https://datacatalog.worldbank.org/search/dataset/0037580/global-shipping-traffic-density",
  years: "2015–2021",
  role:
    "external corridor QA reference; raster data is not shipped to the browser"
};

const AIS_TILE_SOURCE = {
  name: "Global Ship Density - Commercial Vessels",
  serviceItemId: "d2c77a93295e4ac4883103b60047db2f",
  itemUrl:
    "https://www.arcgis.com/home/item.html?id=d2c77a93295e4ac4883103b60047db2f",
  itemMetadataUrl:
    "https://www.arcgis.com/sharing/rest/content/items/d2c77a93295e4ac4883103b60047db2f?f=json",
  serviceUrl:
    "https://tiledimageservices.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Global_Ship_Density_Commercial/ImageServer",
  publisher: "Esri Oceans",
  attribution: "World Bank Group, IMF",
  license: "CC BY 4.0",
  sourceLastUpdated: "2021-05-03",
  level: 8,
  resolutionDegrees: 0.005,
  tileSize: 256,
  origin: [-180.015311275, 85.0026479370001]
};

const TARGET_PATH_COUNTS = {
  Major: 122,
  Middle: 788,
  Minor: 411
};

const AIS_CORRIDOR_ANCHORS = [
  {
    id: "asia-europe",
    label: "亚欧走廊",
    maximumDistanceKm: 150,
    anchors: [
      ["上海", 121.5, 31.216667],
      ["新加坡", 103.822, 1.2644],
      ["苏伊士", 32.35, 30.45],
      ["鹿特丹", 4.483333, 51.9]
    ]
  },
  {
    id: "trans-pacific",
    label: "跨太平洋走廊",
    maximumDistanceKm: 150,
    anchors: [
      ["上海", 121.5, 31.216667],
      ["洛杉矶—长滩", -118.25, 33.75]
    ]
  },
  {
    id: "trans-atlantic",
    label: "跨大西洋走廊",
    maximumDistanceKm: 150,
    anchors: [
      ["鹿特丹", 4.483333, 51.9],
      ["纽约—新泽西", -74.05, 40.67]
    ]
  },
  {
    id: "hormuz",
    label: "霍尔木兹",
    maximumDistanceKm: 100,
    anchors: [["霍尔木兹海峡", 56.25, 26.56]]
  },
  {
    id: "panama",
    label: "巴拿马",
    maximumDistanceKm: 100,
    anchors: [["巴拿马运河", -79.68, 9.08]]
  },
  {
    id: "cape-good-hope",
    label: "好望角",
    maximumDistanceKm: 100,
    anchors: [["好望角", 18.47, -34.36]]
  }
];

const AIS_RASTER_CORRIDOR_SAMPLES = [
  {
    id: "asia-europe",
    label: "亚欧走廊",
    coordinate: [103.90512, 1.34608]
  },
  {
    id: "trans-pacific",
    label: "跨太平洋走廊",
    coordinate: [-170.45185, 50.70111]
  },
  {
    id: "trans-atlantic",
    label: "跨大西洋走廊",
    coordinate: [-40.05926, 46.37258]
  },
  {
    id: "hormuz",
    label: "霍尔木兹",
    coordinate: [56.70307, 26.3732]
  },
  {
    id: "panama",
    label: "巴拿马",
    coordinate: [-79.51152, 8.97891]
  },
  {
    id: "cape-good-hope",
    label: "好望角",
    coordinate: [18.23907, -34.42191]
  }
];

const LL3_PORT_SEQUENCE = [
  ["shanghai", "上海", 31.216667, 121.5],
  ["xiamen", "厦门", 24.45, 118.066667],
  ["nansha", "南沙", 22.65, 113.65],
  ["hong-kong", "香港", 22.266667, 114.2],
  ["yantian", "盐田", 22.583333, 114.266667],
  ["cai-mep", "盖梅", 10.512, 107.016],
  ["singapore", "新加坡", 1.2644, 103.822],
  ["piraeus", "比雷埃夫斯", 37.942, 23.6465],
  ["hamburg", "汉堡", 53.55, 9.933333],
  ["rotterdam", "鹿特丹", 51.9, 4.483333],
  ["zeebrugge", "泽布吕赫", 51.333333, 3.2],
  ["valencia", "瓦伦西亚", 39.45, -0.316667],
  ["piraeus", "比雷埃夫斯", 37.942, 23.6465],
  ["abu-dhabi", "阿布扎比", 24.8117, 54.6506],
  ["singapore", "新加坡", 1.2644, 103.822],
  ["shanghai", "上海", 31.216667, 121.5]
];

const OPENING_TRADE_ROUTE_SEQUENCE = [
  ["canton", "广州港区（南沙）", 22.65, 113.65],
  ["malacca", "马六甲海峡", 2.5, 101.45],
  ["cape-good-hope", "好望角", -34.36, 18.47],
  ["dover", "多佛海峡", 51.05, 1.35],
  ["london", "伦敦", 51.5, -0.1]
];

const EXPECTED_LL3_IDS = LL3_PORT_SEQUENCE.map(([id]) => id);
const TIER_SLUG = {
  Major: "major",
  Middle: "middle",
  Minor: "minor"
};

const allowedNavigableZones = [
  {
    id: "suez-canal",
    label: "苏伊士运河",
    kind: "canal",
    bounds: [31.8, 28.8, 33.1, 31.6]
  },
  {
    id: "panama-canal",
    label: "巴拿马运河",
    kind: "canal",
    bounds: [-80.6, 8.1, -78.6, 9.8]
  },
  {
    id: "shanghai-fairway",
    label: "上海港及长江口航道",
    kind: "port-fairway",
    bounds: [121.25, 30.95, 122.05, 31.6]
  },
  {
    id: "xiamen-fairway",
    label: "厦门港航道",
    kind: "port-fairway",
    bounds: [117.8, 24.15, 118.75, 24.85]
  },
  {
    id: "pearl-river-fairways",
    label: "南沙、香港及盐田港航道",
    kind: "port-fairway",
    bounds: [113, 21.55, 114.75, 22.9]
  },
  {
    id: "cai-mep-fairway",
    label: "盖梅港航道",
    kind: "port-fairway",
    bounds: [106.45, 10.15, 107.25, 11.05]
  },
  {
    id: "singapore-fairway",
    label: "新加坡港航道",
    kind: "port-fairway",
    bounds: [103.45, 0.85, 104.85, 1.85]
  },
  {
    id: "piraeus-fairway",
    label: "比雷埃夫斯港航道",
    kind: "port-fairway",
    bounds: [23.35, 37.65, 24.05, 38.15]
  },
  {
    id: "hamburg-elbe-fairway",
    label: "汉堡港及易北河航道",
    kind: "port-fairway",
    bounds: [8.45, 53.25, 10.2, 54.25]
  },
  {
    id: "rotterdam-fairway",
    label: "鹿特丹港航道",
    kind: "port-fairway",
    bounds: [3.65, 51.65, 4.9, 52.25]
  },
  {
    id: "zeebrugge-fairway",
    label: "泽布吕赫港航道",
    kind: "port-fairway",
    bounds: [2.75, 51.05, 3.55, 51.65]
  },
  {
    id: "valencia-fairway",
    label: "瓦伦西亚港航道",
    kind: "port-fairway",
    bounds: [-0.65, 39.15, 0.05, 39.75]
  },
  {
    id: "abu-dhabi-fairway",
    label: "阿布扎比港航道",
    kind: "port-fairway",
    bounds: [54.15, 24.15, 55.05, 25.15]
  },
  {
    id: "thames-london-fairway",
    label: "泰晤士河口至伦敦港航道",
    kind: "port-fairway",
    bounds: [-0.2, 51.32, 1.55, 51.7]
  }
];

function parseArguments() {
  const values = new Map();
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index];
    if (!key?.startsWith("--")) continue;
    const value = process.argv[index + 1];
    if (value && !value.startsWith("--")) {
      values.set(key.slice(2), value);
      index += 1;
    } else {
      values.set(key.slice(2), true);
    }
  }
  return values;
}

function sha256(path) {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex");
}

function sha256Bytes(bytes) {
  return createHash("sha256")
    .update(Buffer.from(bytes))
    .digest("hex");
}

function assertHash(path, expected, label) {
  const actual = sha256(path);
  if (actual !== expected.toLowerCase()) {
    throw new Error(
      `${label} SHA-256 mismatch: expected ${expected}, received ${actual}`
    );
  }
}

async function ensureDownload(source, destination) {
  if (!existsSync(destination)) {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(
        `Unable to download ${source.name}: HTTP ${response.status}`
      );
    }
    writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
  }
  assertHash(destination, source.sha256, source.name);
}

function roundCoordinate(value) {
  return Number(value.toFixed(5));
}

function normalizeCoordinate(coordinate) {
  return [
    roundCoordinate(Number(coordinate[0])),
    roundCoordinate(Number(coordinate[1]))
  ];
}

function validCoordinate([longitude, latitude]) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function sameCoordinate(left, right) {
  return (
    Math.abs(left[0] - right[0]) < 0.00001 &&
    Math.abs(left[1] - right[1]) < 0.00001
  );
}

function angularDistance(left, right) {
  const latitude1 = (left[1] * Math.PI) / 180;
  const latitude2 = (right[1] * Math.PI) / 180;
  const deltaLatitude = latitude2 - latitude1;
  let deltaLongitude = right[0] - left[0];
  if (deltaLongitude > 180) deltaLongitude -= 360;
  if (deltaLongitude < -180) deltaLongitude += 360;
  const deltaLongitudeRadians = (deltaLongitude * Math.PI) / 180;
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(deltaLongitudeRadians / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeDistanceKm(points) {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += angularDistance(points[index - 1], points[index]) * 6371.0088;
  }
  return distance;
}

function summarizeAisCorridorCoverage(tierPaths) {
  const networkPoints = Object.values(tierPaths).flat(2);
  const corridors = AIS_CORRIDOR_ANCHORS.map((corridor) => {
    const anchors = corridor.anchors.map(
      ([label, longitude, latitude]) => {
        let nearestDistanceKm = Number.POSITIVE_INFINITY;
        for (const point of networkPoints) {
          nearestDistanceKm = Math.min(
            nearestDistanceKm,
            angularDistance([longitude, latitude], point) * 6371.0088
          );
        }
        return {
          label,
          coordinate: [longitude, latitude],
          nearestLaneDistanceKm: Math.round(nearestDistanceKm),
          pass: nearestDistanceKm <= corridor.maximumDistanceKm
        };
      }
    );
    return {
      id: corridor.id,
      label: corridor.label,
      maximumDistanceKm: corridor.maximumDistanceKm,
      anchors,
      pass: anchors.every((anchor) => anchor.pass)
    };
  });
  if (corridors.some((corridor) => !corridor.pass)) {
    const failed = corridors
      .filter((corridor) => !corridor.pass)
      .map((corridor) => corridor.id)
      .join(", ");
    throw new Error(`Shipping network misses AIS corridor anchors: ${failed}`);
  }
  return {
    reference: WORLD_BANK_AIS_SOURCE,
    method:
      "six named corridors are gated by nearest-distance checks from published route vertices to representative port or chokepoint anchors",
    corridors,
    pass: true
  };
}

async function fetchJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
  return response.json();
}

async function summarizeAisRasterQa(tierPaths) {
  const serviceMetadata = await fetchJson(
    `${AIS_TILE_SOURCE.serviceUrl}?f=json`,
    "AIS image service metadata"
  );
  const itemMetadata = await fetchJson(
    AIS_TILE_SOURCE.itemMetadataUrl,
    "AIS item metadata"
  );
  if (
    serviceMetadata.serviceItemId !== AIS_TILE_SOURCE.serviceItemId ||
    serviceMetadata.pixelSizeX !== AIS_TILE_SOURCE.resolutionDegrees ||
    serviceMetadata.pixelSizeY !== AIS_TILE_SOURCE.resolutionDegrees ||
    serviceMetadata.pixelType !== "S32" ||
    itemMetadata.id !== AIS_TILE_SOURCE.serviceItemId ||
    !String(itemMetadata.accessInformation).includes("World Bank") ||
    !String(itemMetadata.accessInformation).includes("IMF")
  ) {
    throw new Error("AIS tiled image service metadata does not match the pinned source");
  }

  const wasmPath = fileURLToPath(
    import.meta.resolve("lerc/lerc-wasm.wasm")
  );
  await Lerc.load({ locateFile: () => wasmPath });
  const [originLongitude, originLatitude] = AIS_TILE_SOURCE.origin;
  const tileSpanDegrees =
    AIS_TILE_SOURCE.tileSize * AIS_TILE_SOURCE.resolutionDegrees;
  const windowRadiusPixels = 20;
  const minimumP95Value = 1_000;
  const tileCache = new Map();

  const loadTile = async (row, column) => {
    const key = `${row}:${column}`;
    if (!tileCache.has(key)) {
      tileCache.set(
        key,
        (async () => {
          const url = `${AIS_TILE_SOURCE.serviceUrl}/tile/${AIS_TILE_SOURCE.level}/${row}/${column}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              `AIS raster tile ${key} returned HTTP ${response.status}`
            );
          }
          const bytes = await response.arrayBuffer();
          return {
            bytes,
            decoded: Lerc.decode(bytes),
            url
          };
        })()
      );
    }
    return tileCache.get(key);
  };

  const corridors = [];
  for (const sample of AIS_RASTER_CORRIDOR_SAMPLES) {
    const [longitude, latitude] = sample.coordinate;
    const column = Math.floor(
      (longitude - originLongitude) / tileSpanDegrees
    );
    const row = Math.floor(
      (originLatitude - latitude) / tileSpanDegrees
    );
    const tile = await loadTile(row, column);
    const tileOriginLongitude =
      originLongitude + column * tileSpanDegrees;
    const tileOriginLatitude =
      originLatitude - row * tileSpanDegrees;
    const pixelColumn = Math.floor(
      (longitude - tileOriginLongitude) /
        AIS_TILE_SOURCE.resolutionDegrees
    );
    const pixelRow = Math.floor(
      (tileOriginLatitude - latitude) /
        AIS_TILE_SOURCE.resolutionDegrees
    );
    if (
      pixelColumn < 0 ||
      pixelColumn >= tile.decoded.width ||
      pixelRow < 0 ||
      pixelRow >= tile.decoded.height
    ) {
      throw new Error(`${sample.id} resolved outside AIS raster tile bounds`);
    }

    const pixels = tile.decoded.pixels[0];
    const mask = tile.decoded.mask;
    const exactIndex = pixelRow * tile.decoded.width + pixelColumn;
    const exactValid = !mask || Boolean(mask[exactIndex]);
    const values = [];
    for (
      let y = Math.max(0, pixelRow - windowRadiusPixels);
      y <=
      Math.min(tile.decoded.height - 1, pixelRow + windowRadiusPixels);
      y += 1
    ) {
      for (
        let x = Math.max(0, pixelColumn - windowRadiusPixels);
        x <=
        Math.min(tile.decoded.width - 1, pixelColumn + windowRadiusPixels);
        x += 1
      ) {
        const index = y * tile.decoded.width + x;
        if (!mask || mask[index]) values.push(pixels[index]);
      }
    }
    values.sort((left, right) => left - right);
    if (values.length === 0) {
      throw new Error(`${sample.id} AIS sample window contains no valid pixels`);
    }

    let nearestLaneDistanceKm = Number.POSITIVE_INFINITY;
    let nearestLaneTier;
    for (const [tier, paths] of Object.entries(tierPaths)) {
      for (const path of paths) {
        for (const point of path) {
          const distanceKm =
            angularDistance(sample.coordinate, point) * 6371.0088;
          if (distanceKm < nearestLaneDistanceKm) {
            nearestLaneDistanceKm = distanceKm;
            nearestLaneTier = tier.toLowerCase();
          }
        }
      }
    }
    const percentile95 =
      values[
        Math.min(
          values.length - 1,
          Math.floor((values.length - 1) * 0.95)
        )
      ];
    const pass =
      nearestLaneDistanceKm <= 1 &&
      percentile95 >= minimumP95Value;
    corridors.push({
      id: sample.id,
      label: sample.label,
      coordinate: sample.coordinate,
      nearestLaneDistanceKm: Number(
        nearestLaneDistanceKm.toFixed(3)
      ),
      nearestLaneTier,
      tile: {
        level: AIS_TILE_SOURCE.level,
        row,
        column,
        sha256: sha256Bytes(tile.bytes)
      },
      sampleWindow: {
        radiusPixels: windowRadiusPixels,
        radiusDegrees:
          windowRadiusPixels * AIS_TILE_SOURCE.resolutionDegrees,
        validPixelCount: values.length,
        exactPixelValid: exactValid,
        exactValue: exactValid ? pixels[exactIndex] : null,
        medianValue: values[Math.floor(values.length * 0.5)],
        percentile95,
        maximumValue: values.at(-1)
      },
      pass
    });
  }
  if (corridors.some((corridor) => !corridor.pass)) {
    const failed = corridors
      .filter((corridor) => !corridor.pass)
      .map((corridor) => corridor.id)
      .join(", ");
    throw new Error(`AIS raster QA failed for corridors: ${failed}`);
  }

  return {
    source: {
      ...AIS_TILE_SOURCE,
      itemModifiedOn: new Date(itemMetadata.modified).toISOString()
    },
    method:
      "level-8 LERC cells at 0.005 degrees are decoded around a published route vertex in each corridor; the 95th percentile in a 0.1-degree window must be positive and the sample must lie on the vector network",
    valueMeaning:
      "total commercial-vessel AIS positions observed from January 2015 through February 2021",
    minimumP95Value,
    corridors,
    pass: true
  };
}

function combineAisCorridorQa(geometryQa, rasterQa) {
  return {
    ...geometryQa,
    raster: rasterQa,
    limitation:
      "the 458.1 MB World Bank archive is not stored in the repository; bounded samples use the public Esri Oceans tiled copy of the same World Bank/IMF commercial-vessel layer and do not constitute navigation validation",
    pass: geometryQa.pass && rasterQa.pass
  };
}

async function updateAisAuditOnly() {
  const globalOutputPath = join(
    outputDirectory,
    "global-shipping-lanes.json"
  );
  const auditOutputPath = join(
    outputDirectory,
    "shipping-lanes-audit.json"
  );
  if (!existsSync(globalOutputPath) || !existsSync(auditOutputPath)) {
    throw new Error(
      "--ais-only requires existing global shipping data and audit output"
    );
  }
  const globalData = JSON.parse(readFileSync(globalOutputPath, "utf8"));
  const tierPaths = {};
  for (const path of globalData.paths) {
    (tierPaths[path.t] ??= []).push(path.p);
  }
  const audit = JSON.parse(readFileSync(auditOutputPath, "utf8"));
  const geometryQa = summarizeAisCorridorCoverage(tierPaths);
  const rasterQa = await summarizeAisRasterQa(tierPaths);
  audit.generatedOn = new Date().toISOString();
  audit.sources.worldBankAis = WORLD_BANK_AIS_SOURCE;
  audit.sources.aisTileService = AIS_TILE_SOURCE;
  audit.aisCorridorQa = combineAisCorridorQa(
    geometryQa,
    rasterQa
  );
  writeFileSync(auditOutputPath, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        auditOutputPath,
        corridorCount: rasterQa.corridors.length,
        rasterQaPass: rasterQa.pass
      },
      null,
      2
    )
  );
}

function buildLandIndex(landGeoJson) {
  const polygons = [];
  for (const feature of landGeoJson.features) {
    const geometries =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const rings of geometries) {
      const outer = rings[0];
      if (!outer?.length) continue;
      let minimumLongitude = Infinity;
      let maximumLongitude = -Infinity;
      let minimumLatitude = Infinity;
      let maximumLatitude = -Infinity;
      for (const [longitude, latitude] of outer) {
        minimumLongitude = Math.min(minimumLongitude, longitude);
        maximumLongitude = Math.max(maximumLongitude, longitude);
        minimumLatitude = Math.min(minimumLatitude, latitude);
        maximumLatitude = Math.max(maximumLatitude, latitude);
      }
      polygons.push({
        rings,
        minimumLongitude,
        maximumLongitude,
        minimumLatitude,
        maximumLatitude
      });
    }
  }
  const cellSize = 2;
  const cells = new Map();
  polygons.forEach((polygon, polygonIndex) => {
    const minimumCellLongitude = Math.floor(
      (polygon.minimumLongitude + 180) / cellSize
    );
    const maximumCellLongitude = Math.floor(
      (polygon.maximumLongitude + 180) / cellSize
    );
    const minimumCellLatitude = Math.floor(
      (polygon.minimumLatitude + 90) / cellSize
    );
    const maximumCellLatitude = Math.floor(
      (polygon.maximumLatitude + 90) / cellSize
    );
    for (
      let longitudeCell = minimumCellLongitude;
      longitudeCell <= maximumCellLongitude;
      longitudeCell += 1
    ) {
      for (
        let latitudeCell = minimumCellLatitude;
        latitudeCell <= maximumCellLatitude;
        latitudeCell += 1
      ) {
        const key = `${longitudeCell}:${latitudeCell}`;
        const candidates = cells.get(key) ?? [];
        candidates.push(polygonIndex);
        cells.set(key, candidates);
      }
    }
  });
  return { polygons, cells, cellSize };
}

function pointInRing(longitude, latitude, ring) {
  let inside = false;
  for (
    let index = 0, previousIndex = ring.length - 1;
    index < ring.length;
    previousIndex = index, index += 1
  ) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previousIndex];
    const crossesLatitude =
      currentLatitude > latitude !== previousLatitude > latitude;
    if (
      crossesLatitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function pointOnLand(longitude, latitude, landIndex) {
  const longitudeCell = Math.floor(
    (longitude + 180) / landIndex.cellSize
  );
  const latitudeCell = Math.floor(
    (latitude + 90) / landIndex.cellSize
  );
  const candidates =
    landIndex.cells.get(`${longitudeCell}:${latitudeCell}`) ?? [];
  for (const polygonIndex of candidates) {
    const polygon = landIndex.polygons[polygonIndex];
    if (
      longitude < polygon.minimumLongitude ||
      longitude > polygon.maximumLongitude ||
      latitude < polygon.minimumLatitude ||
      latitude > polygon.maximumLatitude ||
      !pointInRing(longitude, latitude, polygon.rings[0])
    ) {
      continue;
    }
    const insideHole = polygon.rings
      .slice(1)
      .some((ring) => pointInRing(longitude, latitude, ring));
    if (!insideHole) return true;
  }
  return false;
}

function inAllowedNavigableZone(longitude, latitude) {
  return allowedNavigableZones.some(({ bounds }) => {
    const [minimumLongitude, minimumLatitude, maximumLongitude, maximumLatitude] =
      bounds;
    return (
      longitude >= minimumLongitude &&
      longitude <= maximumLongitude &&
      latitude >= minimumLatitude &&
      latitude <= maximumLatitude
    );
  });
}

function segmentLandSamples(start, end, landIndex, stepDegrees = 0.08) {
  let startLongitude = start[0];
  let endLongitude = end[0];
  const latitudeDelta = end[1] - start[1];
  let longitudeDelta = endLongitude - startLongitude;
  if (longitudeDelta > 180) {
    startLongitude += 360;
    longitudeDelta = endLongitude - startLongitude;
  } else if (longitudeDelta < -180) {
    endLongitude += 360;
    longitudeDelta = endLongitude - startLongitude;
  }
  const sampleCount = Math.max(
    1,
    Math.ceil(Math.hypot(longitudeDelta, latitudeDelta) / stepDegrees)
  );
  const samples = [];
  for (let sampleIndex = 1; sampleIndex < sampleCount; sampleIndex += 1) {
    let longitude =
      startLongitude + (longitudeDelta * sampleIndex) / sampleCount;
    if (longitude > 180) longitude -= 360;
    if (longitude < -180) longitude += 360;
    const latitude =
      start[1] + (latitudeDelta * sampleIndex) / sampleCount;
    if (
      !inAllowedNavigableZone(longitude, latitude) &&
      pointOnLand(longitude, latitude, landIndex)
    ) {
      samples.push([roundCoordinate(longitude), roundCoordinate(latitude)]);
    }
  }
  return samples;
}

function findLandCrossings(tierPaths, landIndex) {
  const crossings = [];
  for (const [tier, paths] of Object.entries(tierPaths)) {
    paths.forEach((path, pathIndex) => {
      for (let segmentIndex = 1; segmentIndex < path.length; segmentIndex += 1) {
        const start = path[segmentIndex - 1];
        const end = path[segmentIndex];
        const samples = segmentLandSamples(start, end, landIndex);
        if (samples.length === 0) continue;
        crossings.push({
          id: `${TIER_SLUG[tier]}-${pathIndex}-${segmentIndex - 1}`,
          tier,
          pathIndex,
          segmentIndex: segmentIndex - 1,
          start,
          end,
          samples
        });
      }
    });
  }
  return crossings;
}

function csvValue(value) {
  const stringValue = String(value);
  return /[",\r\n]/u.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

function runSeaRoute(rows, searouteDirectory, workDirectory, outputName) {
  if (rows.length === 0) return new Map();
  const jarPath = join(searouteDirectory, "searoute.jar");
  const networkPath = join(
    searouteDirectory,
    "marnet",
    "marnet_plus_5km.gpkg"
  );
  if (!existsSync(jarPath) || !existsSync(networkPath)) {
    throw new Error(
      "SeaRoute release is missing. Pass --searoute-dir <release/searoute>."
    );
  }
  assertHash(jarPath, SEAROUTE_SOURCE.jarSha256, "SeaRoute JAR");
  assertHash(
    networkPath,
    SEAROUTE_SOURCE.networkSha256,
    "SeaRoute 5 km network"
  );

  const inputPath = join(workDirectory, `${outputName}.csv`);
  const relativeOutput = join("marnet", `${outputName}.geojson`);
  const outputPath = join(searouteDirectory, relativeOutput);
  const header = ["routeId", "olon", "olat", "dlon", "dlat"];
  const csvRows = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.start[0],
        row.start[1],
        row.end[0],
        row.end[1]
      ]
        .map(csvValue)
        .join(",")
    )
  ];
  writeFileSync(inputPath, `${csvRows.join("\n")}\n`);
  const reuseExistingOutput =
    process.env.GLOBE_REUSE_SEAROUTE_OUTPUT === "1" &&
    existsSync(outputPath);
  if (!reuseExistingOutput) {
    rmSync(outputPath, { force: true });
    const result = spawnSync(
      "java",
      [
        "-jar",
        jarPath,
        "-i",
        inputPath,
        "-res",
        "5",
        "-suez",
        "1",
        "-panama",
        "1",
        "-malacca",
        "1",
        "-gibraltar",
        "1",
        "-dover",
        "1",
        "-babelmandeb",
        "1",
        "-o",
        relativeOutput
      ],
      {
        cwd: searouteDirectory,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024
      }
    );
    if (result.status !== 0 || !existsSync(outputPath)) {
      throw new Error(
        `SeaRoute failed (${result.status ?? "unknown"}): ${
          result.stderr || result.stdout
        }`
      );
    }
  }

  const resultGeoJson = JSON.parse(readFileSync(outputPath, "utf8"));
  const routes = new Map();
  for (const feature of resultGeoJson.features) {
    const id = String(feature.properties.routeId);
    const row = rows.find((candidate) => candidate.id === id);
    if (!row) continue;
    const lines =
      feature.geometry.type === "MultiLineString"
        ? feature.geometry.coordinates
        : [feature.geometry.coordinates];
    let coordinates = lines
      .flatMap((line, lineIndex) =>
        lineIndex === 0 ? line : line.slice(1)
      )
      .map(normalizeCoordinate);
    const forwardScore =
      angularDistance(coordinates[0], row.start) +
      angularDistance(coordinates.at(-1), row.end);
    const reverseScore =
      angularDistance(coordinates[0], row.end) +
      angularDistance(coordinates.at(-1), row.start);
    if (reverseScore < forwardScore) coordinates = coordinates.reverse();
    coordinates[0] = row.start;
    coordinates[coordinates.length - 1] = row.end;
    coordinates = coordinates.filter(
      (coordinate, index) =>
        index === 0 || !sameCoordinate(coordinate, coordinates[index - 1])
    );
    routes.set(id, coordinates);
  }
  if (routes.size !== rows.length) {
    throw new Error(
      `SeaRoute returned ${routes.size} routes for ${rows.length} requests`
    );
  }
  return routes;
}

function spliceRepairs(tierPaths, crossings, repairedRoutes) {
  const repairsByPath = new Map();
  for (const crossing of crossings) {
    const key = `${crossing.tier}:${crossing.pathIndex}`;
    const repairs = repairsByPath.get(key) ?? new Map();
    repairs.set(crossing.segmentIndex, repairedRoutes.get(crossing.id));
    repairsByPath.set(key, repairs);
  }

  return Object.fromEntries(
    Object.entries(tierPaths).map(([tier, paths]) => [
      tier,
      paths.map((path, pathIndex) => {
        const repairs = repairsByPath.get(`${tier}:${pathIndex}`);
        if (!repairs) return path;
        const output = [path[0]];
        for (
          let segmentIndex = 0;
          segmentIndex < path.length - 1;
          segmentIndex += 1
        ) {
          const replacement = repairs.get(segmentIndex);
          if (replacement) output.push(...replacement.slice(1));
          else output.push(path[segmentIndex + 1]);
        }
        return output;
      })
    ])
  );
}

function removeResidualLandSegments(tierPaths, landIndex) {
  const cleaned = {};
  const removed = [];
  for (const [tier, paths] of Object.entries(tierPaths)) {
    const fragments = [];
    paths.forEach((path, pathIndex) => {
      let currentFragment = [path[0]];
      for (let segmentIndex = 1; segmentIndex < path.length; segmentIndex += 1) {
        const start = path[segmentIndex - 1];
        const end = path[segmentIndex];
        const landSamples = segmentLandSamples(start, end, landIndex);
        if (landSamples.length > 0) {
          if (currentFragment.length >= 2) fragments.push(currentFragment);
          removed.push({
            tier,
            pathIndex,
            segmentIndex: segmentIndex - 1,
            start,
            end,
            landSamples: landSamples.slice(0, 4)
          });
          currentFragment = [end];
        } else {
          currentFragment.push(end);
        }
      }
      if (currentFragment.length >= 2) fragments.push(currentFragment);
    });
    cleaned[tier] = fragments;
  }
  return { paths: cleaned, removed };
}

function interpolateCoordinate(start, end, progress) {
  let startLongitude = start[0];
  let endLongitude = end[0];
  if (endLongitude - startLongitude > 180) startLongitude += 360;
  if (endLongitude - startLongitude < -180) endLongitude += 360;
  let longitude =
    startLongitude + (endLongitude - startLongitude) * progress;
  if (longitude > 180) longitude -= 360;
  if (longitude < -180) longitude += 360;
  return [
    longitude,
    start[1] + (end[1] - start[1]) * progress
  ];
}

function findWaterDetour(start, end, landIndex) {
  const midpoint = interpolateCoordinate(start, end, 0.5);
  let longitudeDelta = end[0] - start[0];
  if (longitudeDelta > 180) longitudeDelta -= 360;
  if (longitudeDelta < -180) longitudeDelta += 360;
  const latitudeDelta = end[1] - start[1];
  const longitudeScale = Math.max(
    0.2,
    Math.cos((midpoint[1] * Math.PI) / 180)
  );
  const projectedLongitudeDelta = longitudeDelta * longitudeScale;
  const length = Math.max(
    0.0001,
    Math.hypot(projectedLongitudeDelta, latitudeDelta)
  );
  const perpendicularLongitude =
    -latitudeDelta / length / longitudeScale;
  const perpendicularLatitude = projectedLongitudeDelta / length;
  const offsets = [
    0.04,
    0.08,
    0.15,
    0.3,
    0.6,
    1.2,
    2.4,
    4.8,
    7.2,
    10
  ];

  for (const direction of [1, -1]) {
    for (const offset of offsets) {
      const candidate = normalizeCoordinate([
        midpoint[0] +
          perpendicularLongitude * offset * direction,
        midpoint[1] +
          perpendicularLatitude * offset * direction
      ]);
      if (
        !validCoordinate(candidate) ||
        pointOnLand(candidate[0], candidate[1], landIndex) ||
        segmentLandSamples(start, candidate, landIndex, 0.04).length >
          0 ||
        segmentLandSamples(candidate, end, landIndex, 0.04).length > 0
      ) {
        continue;
      }
      return [candidate];
    }
  }

  for (const direction of [1, -1]) {
    for (const offset of offsets) {
      const firstBase = interpolateCoordinate(start, end, 0.33);
      const secondBase = interpolateCoordinate(start, end, 0.67);
      const first = normalizeCoordinate([
        firstBase[0] +
          perpendicularLongitude * offset * direction,
        firstBase[1] +
          perpendicularLatitude * offset * direction
      ]);
      const second = normalizeCoordinate([
        secondBase[0] +
          perpendicularLongitude * offset * direction,
        secondBase[1] +
          perpendicularLatitude * offset * direction
      ]);
      if (
        !validCoordinate(first) ||
        !validCoordinate(second) ||
        pointOnLand(first[0], first[1], landIndex) ||
        pointOnLand(second[0], second[1], landIndex) ||
        segmentLandSamples(start, first, landIndex, 0.04).length >
          0 ||
        segmentLandSamples(first, second, landIndex, 0.04).length >
          0 ||
        segmentLandSamples(second, end, landIndex, 0.04).length > 0
      ) {
        continue;
      }
      return [first, second];
    }
  }
  return undefined;
}

function correctContinuousRoute(points, landIndex, label) {
  let corrected = [...points];
  const corrections = [];
  for (let pass = 0; pass < 5; pass += 1) {
    const output = [corrected[0]];
    let changed = false;
    for (let index = 1; index < corrected.length; index += 1) {
      const start = corrected[index - 1];
      const end = corrected[index];
      const landSamples = segmentLandSamples(
        start,
        end,
        landIndex,
        0.04
      );
      if (landSamples.length === 0) {
        output.push(end);
        continue;
      }
      const detour = findWaterDetour(start, end, landIndex);
      if (!detour) {
        throw new Error(
          `${label} cannot find a water detour for ${JSON.stringify(
            start
          )} -> ${JSON.stringify(end)}`
        );
      }
      output.push(...detour, end);
      corrections.push({
        pass,
        start,
        end,
        detour,
        landSamples: landSamples.slice(0, 4)
      });
      changed = true;
    }
    corrected = output;
    if (!changed) break;
  }
  const remainingCrossings = [];
  for (let index = 1; index < corrected.length; index += 1) {
    const samples = segmentLandSamples(
      corrected[index - 1],
      corrected[index],
      landIndex,
      0.04
    );
    if (samples.length > 0) {
      remainingCrossings.push({
        start: corrected[index - 1],
        end: corrected[index],
        samples
      });
    }
  }
  if (remainingCrossings.length > 0) {
    throw new Error(
      `${label} retains ${remainingCrossings.length} land crossings`
    );
  }
  return { points: corrected, corrections };
}

function splitPaths(paths, targetCount) {
  if (targetCount < paths.length) {
    throw new Error(
      `Cannot preserve ${paths.length} source parts in ${targetCount} paths`
    );
  }
  const allocations = paths.map(() => 1);
  let remaining = targetCount - paths.length;
  while (remaining > 0) {
    let selectedIndex = -1;
    let selectedScore = -Infinity;
    paths.forEach((path, index) => {
      const segments = path.length - 1;
      if (allocations[index] >= segments) return;
      const score = segments / allocations[index];
      if (score > selectedScore) {
        selectedScore = score;
        selectedIndex = index;
      }
    });
    if (selectedIndex < 0) {
      throw new Error(`Unable to split source geometry into ${targetCount} paths`);
    }
    allocations[selectedIndex] += 1;
    remaining -= 1;
  }

  return paths.flatMap((path, pathIndex) => {
    const chunkCount = allocations[pathIndex];
    const segmentCount = path.length - 1;
    const chunks = [];
    let segmentStart = 0;
    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const segmentEnd = Math.round(
        ((chunkIndex + 1) * segmentCount) / chunkCount
      );
      chunks.push(path.slice(segmentStart, segmentEnd + 1));
      segmentStart = segmentEnd;
    }
    return chunks;
  });
}

function flattenLl3Route(features, rows, startIndex, endIndex) {
  const output = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    const points = features.get(rows[index].id);
    if (!points) {
      throw new Error(`Missing LL3 leg ${rows[index].id}`);
    }
    output.push(...(output.length === 0 ? points : points.slice(1)));
  }
  return output.filter(
    (coordinate, index) =>
      index === 0 || !sameCoordinate(coordinate, output[index - 1])
  );
}

function validateCoordinates(paths, label) {
  const invalid = paths.flatMap((path) =>
    path.filter((coordinate) => !validCoordinate(coordinate))
  );
  if (invalid.length > 0) {
    throw new Error(`${label} contains ${invalid.length} invalid coordinates`);
  }
  const discontinuities = [];
  paths.forEach((path, pathIndex) => {
    for (let index = 1; index < path.length; index += 1) {
      const distance = angularDistance(path[index - 1], path[index]);
      if (distance > Math.PI * 0.45) {
        discontinuities.push({ pathIndex, segmentIndex: index - 1, distance });
      }
    }
  });
  if (discontinuities.length > 0) {
    throw new Error(
      `${label} contains ${discontinuities.length} discontinuous segments`
    );
  }
}

function summarizeLandAudit(tierPaths, landIndex) {
  const crossings = findLandCrossings(tierPaths, landIndex);
  return {
    method:
      "segments sampled at <=0.08 degrees against Natural Earth 1:10m land polygons; Suez and Panama canal envelopes are classified as navigable exceptions",
    allowedNavigableZones,
    nonNavigableLandIntersections: crossings.length,
    examples: crossings.slice(0, 20).map((crossing) => ({
      tier: crossing.tier,
      start: crossing.start,
      end: crossing.end,
      landSamples: crossing.samples.slice(0, 4)
    }))
  };
}

function buildOpeningTradeRoute(
  searouteDirectory,
  workspace,
  landIndex,
  landSourcePath
) {
  const rows = OPENING_TRADE_ROUTE_SEQUENCE.slice(0, -1).map(
    ([id, , latitude, longitude], index) => {
      const [, , destinationLatitude, destinationLongitude] =
        OPENING_TRADE_ROUTE_SEQUENCE[index + 1];
      return {
        id: `opening-${String(index + 1).padStart(2, "0")}-${id}`,
        start: [longitude, latitude],
        end: [destinationLongitude, destinationLatitude]
      };
    }
  );
  const legs = runSeaRoute(
    rows,
    searouteDirectory,
    workspace,
    "opening-trade-route-legs"
  );
  const rawRoute = flattenLl3Route(legs, rows, 0, rows.length);
  const correction = correctContinuousRoute(
    rawRoute,
    landIndex,
    "Opening trade route"
  );
  const points = correction.points;
  validateCoordinates([points], "Opening trade route output");
  const landAudit = summarizeLandAudit(
    { Major: [points] },
    landIndex
  );
  if (landAudit.nonNavigableLandIntersections > 0) {
    throw new Error(
      `Opening trade route retains ${landAudit.nonNavigableLandIntersections} land intersections`
    );
  }
  const output = {
    schemaVersion: 1,
    source: {
      method: "course route reconstruction",
      seaRoute: SEAROUTE_SOURCE,
      landQa: LAND_SOURCE
    },
    disclaimer:
      "广州—马六甲—好望角—多佛—伦敦路线依据固定通道点复原，仅作教学路线示意，不代表某一批丝绸的可追踪完整航迹。",
    forcedWaypoints: OPENING_TRADE_ROUTE_SEQUENCE.map(
      ([id, label, latitude, longitude]) => ({
        id,
        label,
        latitude,
        longitude
      })
    ),
    route: {
      id: "canton-london-reconstruction",
      label: "广州至伦敦历史贸易路线复原",
      color: "#efb35e",
      points
    },
    audit: {
      naturalEarthLandSha256: sha256(landSourcePath),
      corrections: correction.corrections.length,
      ...landAudit,
      pass: landAudit.nonNavigableLandIntersections === 0
    }
  };
  const outputPath = join(
    outputDirectory,
    "opening-trade-route.json"
  );
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        outputPath,
        waypointCount: output.forcedWaypoints.length,
        vertexCount: points.length,
        landQaPass: output.audit.pass
      },
      null,
      2
    )
  );
}

async function main() {
  const argumentsMap = parseArguments();
  mkdirSync(outputDirectory, { recursive: true });
  if (argumentsMap.has("ais-only")) {
    await updateAisAuditOnly();
    return;
  }
  const workspace =
    argumentsMap.get("cache-dir") ??
    join(tmpdir(), "edu-sys-globe-shipping-data");
  const searouteSourceDirectory =
    argumentsMap.get("searoute-dir") ??
    process.env.SEAROUTE_HOME;
  if (
    typeof searouteSourceDirectory !== "string" ||
    searouteSourceDirectory.length === 0
  ) {
    throw new Error(
      "SeaRoute release is required. Pass --searoute-dir <release/searoute> or set SEAROUTE_HOME."
    );
  }
  const searouteDirectory = resolve(searouteSourceDirectory);
  mkdirSync(workspace, { recursive: true });

  const shippingSourcePath = join(
    workspace,
    basename(new URL(SHIPPING_SOURCE.url).pathname)
  );
  const landSourcePath = join(
    workspace,
    basename(new URL(LAND_SOURCE.url).pathname)
  );
  await Promise.all([
    ensureDownload(SHIPPING_SOURCE, shippingSourcePath),
    ensureDownload(LAND_SOURCE, landSourcePath)
  ]);

  const shippingGeoJson = JSON.parse(
    readFileSync(shippingSourcePath, "utf8")
  );
  const landGeoJson = JSON.parse(readFileSync(landSourcePath, "utf8"));
  const landIndex = buildLandIndex(landGeoJson);
  if (argumentsMap.has("opening-only")) {
    buildOpeningTradeRoute(
      searouteDirectory,
      workspace,
      landIndex,
      landSourcePath
    );
    return;
  }
  const sourceTierPaths = Object.fromEntries(
    shippingGeoJson.features.map((feature) => [
      feature.properties.Type,
      feature.geometry.coordinates.map((path) =>
        path.map(normalizeCoordinate)
      )
    ])
  );
  const sourcePartCounts = Object.fromEntries(
    Object.entries(sourceTierPaths).map(([tier, paths]) => [
      tier,
      paths.length
    ])
  );
  const sourceVertexCounts = Object.fromEntries(
    Object.entries(sourceTierPaths).map(([tier, paths]) => [
      tier,
      paths.reduce((sum, path) => sum + path.length, 0)
    ])
  );
  Object.entries(sourceTierPaths).forEach(([tier, paths]) =>
    validateCoordinates(paths, `${tier} source`)
  );

  const originalCrossings = findLandCrossings(
    sourceTierPaths,
    landIndex
  );
  const repairedRoutes = runSeaRoute(
    originalCrossings,
    searouteDirectory,
    workspace,
    "global-land-repairs"
  );
  const repairedTierPaths = spliceRepairs(
    sourceTierPaths,
    originalCrossings,
    repairedRoutes
  );
  const residualCleanup = removeResidualLandSegments(
    repairedTierPaths,
    landIndex
  );
  const postRepairAudit = summarizeLandAudit(
    residualCleanup.paths,
    landIndex
  );
  if (postRepairAudit.nonNavigableLandIntersections > 0) {
    throw new Error(
      `Land QA still found ${postRepairAudit.nonNavigableLandIntersections} non-navigable intersections after SeaRoute repair`
    );
  }

  const splitTierPaths = Object.fromEntries(
    Object.entries(residualCleanup.paths).map(([tier, paths]) => [
      tier,
      splitPaths(paths, TARGET_PATH_COUNTS[tier])
    ])
  );
  Object.entries(splitTierPaths).forEach(([tier, paths]) => {
    if (paths.length !== TARGET_PATH_COUNTS[tier]) {
      throw new Error(
        `${tier} expected ${TARGET_PATH_COUNTS[tier]} paths, received ${paths.length}`
      );
    }
    validateCoordinates(paths, `${tier} output`);
  });

  const compactPaths = Object.entries(splitTierPaths).flatMap(
    ([tier, paths]) =>
      paths.map((points, index) => ({
        i: `${TIER_SLUG[tier]}-${String(index + 1).padStart(3, "0")}`,
        t: TIER_SLUG[tier],
        p: points
      }))
  );
  const globalData = {
    schemaVersion: 1,
    source: SHIPPING_SOURCE,
    qa: {
      land: LAND_SOURCE,
      ais: WORLD_BANK_AIS_SOURCE,
      seaRoute: SEAROUTE_SOURCE
    },
    pathCounts: {
      major: splitTierPaths.Major.length,
      middle: splitTierPaths.Middle.length,
      minor: splitTierPaths.Minor.length,
      total: compactPaths.length
    },
    sourcePartCounts: {
      major: sourcePartCounts.Major,
      middle: sourcePartCounts.Middle,
      minor: sourcePartCounts.Minor
    },
    paths: compactPaths
  };
  const globalOutputPath = join(
    outputDirectory,
    "global-shipping-lanes.json"
  );
  writeFileSync(globalOutputPath, JSON.stringify(globalData));

  const ll3Rows = LL3_PORT_SEQUENCE.slice(0, -1).map(
    ([id, , latitude, longitude], index) => {
      const [, , destinationLatitude, destinationLongitude] =
        LL3_PORT_SEQUENCE[index + 1];
      return {
        id: `ll3-${String(index + 1).padStart(2, "0")}-${id}`,
        start: [longitude, latitude],
        end: [destinationLongitude, destinationLatitude]
      };
    }
  );
  const ll3Legs = runSeaRoute(
    ll3Rows,
    searouteDirectory,
    workspace,
    "ll3-port-legs"
  );
  const rawWestbound = flattenLl3Route(
    ll3Legs,
    ll3Rows,
    0,
    10
  );
  const rawEastbound = flattenLl3Route(
    ll3Legs,
    ll3Rows,
    10,
    15
  );
  const westboundCorrection = correctContinuousRoute(
    rawWestbound,
    landIndex,
    "LL3 westbound"
  );
  const eastboundCorrection = correctContinuousRoute(
    rawEastbound,
    landIndex,
    "LL3 eastbound"
  );
  const westbound = westboundCorrection.points;
  const eastbound = eastboundCorrection.points;
  validateCoordinates([westbound, eastbound], "LL3 output");
  const ll3Data = {
    schemaVersion: 1,
    source: {
      service: "OOCL LL3",
      portSequenceYear: 2023,
      portSequence: OOCL_LL3_SOURCE,
      seaRoute: SEAROUTE_SOURCE
    },
    officialPortSequence: EXPECTED_LL3_IDS,
    routes: [
      {
        id: "ll3-westbound",
        label: "上海至北欧",
        color: "#5ee7ff",
        points: westbound
      },
      {
        id: "ll3-eastbound",
        label: "欧洲返亚洲",
        color: "#ffb86b",
        points: eastbound
      }
    ]
  };
  const ll3OutputPath = join(
    outputDirectory,
    "ll3-maritime-routes.json"
  );
  writeFileSync(ll3OutputPath, JSON.stringify(ll3Data));

  const outputBytes = readFileSync(globalOutputPath).byteLength;
  if (outputBytes > 1_500_000) {
    throw new Error(
      `Global browser data is ${outputBytes} bytes; the limit is 1,500,000`
    );
  }
  const aisGeometryQa = summarizeAisCorridorCoverage(splitTierPaths);
  const aisRasterQa = await summarizeAisRasterQa(splitTierPaths);
  const audit = {
    schemaVersion: 1,
    generatedOn: new Date().toISOString(),
    sources: {
      shippingLanes: SHIPPING_SOURCE,
      naturalEarthLand: LAND_SOURCE,
      seaRoute: SEAROUTE_SOURCE,
      ooclLl3: OOCL_LL3_SOURCE,
      worldBankAis: WORLD_BANK_AIS_SOURCE,
      aisTileService: AIS_TILE_SOURCE
    },
    hashes: {
      shippingSource: sha256(shippingSourcePath),
      naturalEarthLand: sha256(landSourcePath),
      seaRouteJar: sha256(join(searouteDirectory, "searoute.jar")),
      seaRoute5kmNetwork: sha256(
        join(
          searouteDirectory,
          "marnet",
          "marnet_plus_5km.gpkg"
        )
      ),
      globalOutput: sha256(globalOutputPath),
      ll3Output: sha256(ll3OutputPath)
    },
    global: {
      sourceFeatureCount: shippingGeoJson.features.length,
      sourcePartCounts,
      sourceVertexCounts,
      detectedCrossingSegments: originalCrossings.length,
      repairedCrossingSegments: repairedRoutes.size,
      removedResidualCrossingSegments:
        residualCleanup.removed.length,
      removedResidualCrossingExamples:
        residualCleanup.removed.slice(0, 20),
      pathCounts: globalData.pathCounts,
      outputBytes,
      ...postRepairAudit
    },
    aisCorridorQa: combineAisCorridorQa(
      aisGeometryQa,
      aisRasterQa
    ),
    ll3: {
      officialPortSequence: EXPECTED_LL3_IDS,
      legCount: ll3Rows.length,
      routeVertexCounts: {
        westbound: westbound.length,
        eastbound: eastbound.length
      },
      routeDistanceKm: {
        westbound: Math.round(routeDistanceKm(westbound)),
        eastbound: Math.round(routeDistanceKm(eastbound))
      },
      shorelineCorrections: {
        westbound: westboundCorrection.corrections.length,
        eastbound: eastboundCorrection.corrections.length
      },
      nonNavigableLandIntersections: 0
    }
  };
  const auditOutputPath = join(
    outputDirectory,
    "shipping-lanes-audit.json"
  );
  writeFileSync(auditOutputPath, `${JSON.stringify(audit, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        globalOutputPath,
        ll3OutputPath,
        auditOutputPath,
        pathCounts: globalData.pathCounts,
        globalOutputBytes: outputBytes,
        repairedCrossingSegments: repairedRoutes.size,
        ll3RouteVertexCounts: audit.ll3.routeVertexCounts
      },
      null,
      2
    )
  );
}

await main();
