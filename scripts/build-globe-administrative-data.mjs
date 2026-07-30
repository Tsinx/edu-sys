import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const OUTPUT_PATH = resolve(
  REPOSITORY_ROOT,
  "apps/teacher-web/src/features/globe/data/prc-administrative-boundaries.json"
);

const SOURCE_URLS = {
  china:
    "http://bzdt.ch.mnr.gov.cn/data/topodata/chinatopo.json",
  world:
    "http://bzdt.ch.mnr.gov.cn/data/topodata/worldtopo_h.json",
  maritime:
    "http://bzdt.ch.mnr.gov.cn/data/topodata/worldtopo.json"
};

const CHINA_LAYER_NAMES = {
  nationalBoundary: ["中国国界", "未定国界", "国内海岸线"],
  provinceBoundary: ["省级行政界全"],
  importantIslands: "重要岛点"
};

const WORLD_LAYER_NAMES = [
  "已定国界",
  "未定国界",
  "地区界",
  "停火线、军事分界线"
];

const WORLD_GRATICULE_NAME = "经纬线";
const MARITIME_GRATICULE_NAME = "经纬网";
const MARITIME_LAYER_NAME = "南海诸岛归属范围线";

const WORLD_LONGITUDES = Array.from(
  { length: 13 },
  (_, index) => -30 + index * 30
);
const WORLD_LATITUDES = Array.from(
  { length: 11 },
  (_, index) => -75 + index * 15
);
const MARITIME_LATITUDES = [-60, -30, 0, 23.437, 30, 60];

const DEGREES = Math.PI / 180;

async function fetchTopology(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

function topologyArc(topology, reference) {
  const arcIndex = reference < 0 ? ~reference : reference;
  const sourceArc = topology.arcs[arcIndex];
  if (!sourceArc) return [];

  const arc = reference < 0 ? [...sourceArc].reverse() : sourceArc;
  if (!topology.transform) return arc;

  const [scaleX, scaleY] = topology.transform.scale;
  const [translateX, translateY] = topology.transform.translate;
  let x = 0;
  let y = 0;
  return arc.map(([deltaX, deltaY]) => {
    x += deltaX;
    y += deltaY;
    return [x * scaleX + translateX, y * scaleY + translateY];
  });
}

function joinTopologyArcs(topology, references) {
  return references.flatMap((reference, index) => {
    const arc = topologyArc(topology, reference);
    return index === 0 ? arc : arc.slice(1);
  });
}

function geometryPaths(topology, geometry) {
  if (geometry.type === "LineString") {
    return [joinTopologyArcs(topology, geometry.arcs)];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.arcs.map((references) =>
      joinTopologyArcs(topology, references)
    );
  }
  if (geometry.type === "Polygon") {
    return geometry.arcs.map((references) =>
      joinTopologyArcs(topology, references)
    );
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.arcs.flatMap((polygon) =>
      polygon.map((references) =>
        joinTopologyArcs(topology, references)
      )
    );
  }
  return [];
}

function objectPaths(topology, objectName) {
  const object = topology.objects[objectName];
  if (!object) {
    throw new Error(`Missing topology object: ${objectName}`);
  }
  return object.geometries.flatMap((geometry) =>
    geometryPaths(topology, geometry)
  );
}

function objectPoints(topology, objectName) {
  const object = topology.objects[objectName];
  if (!object) {
    throw new Error(`Missing topology object: ${objectName}`);
  }
  return object.geometries
    .filter((geometry) => geometry.type === "Point")
    .map((geometry) => geometry.coordinates);
}

function chinaAlbersParameters() {
  const semiMajorAxis = 6_378_245;
  const inverseFlattening = 298.3;
  const flattening = 1 / inverseFlattening;
  const semiMinorAxis = semiMajorAxis * (1 - flattening);
  const eccentricity = Math.sqrt(
    1 -
      (semiMinorAxis * semiMinorAxis) /
        (semiMajorAxis * semiMajorAxis)
  );
  const standardParallelOne = 25 * DEGREES;
  const standardParallelTwo = 47 * DEGREES;
  const latitudeOfOrigin = 0;
  const centralMeridian = 110 * DEGREES;

  const m = (latitude) =>
    Math.cos(latitude) /
    Math.sqrt(
      1 -
        eccentricity *
          eccentricity *
          Math.sin(latitude) *
          Math.sin(latitude)
    );
  const q = (latitude) => {
    const sinLatitude = Math.sin(latitude);
    const eccentricitySinLatitude =
      eccentricity * sinLatitude;
    return (
      (1 - eccentricity * eccentricity) *
      (sinLatitude /
        (1 -
          eccentricity *
            eccentricity *
            sinLatitude *
            sinLatitude) -
        Math.log(
          (1 - eccentricitySinLatitude) /
            (1 + eccentricitySinLatitude)
        ) /
          (2 * eccentricity))
    );
  };

  const mOne = m(standardParallelOne);
  const mTwo = m(standardParallelTwo);
  const qOne = q(standardParallelOne);
  const qTwo = q(standardParallelTwo);
  const coneConstant =
    (mOne * mOne - mTwo * mTwo) / (qTwo - qOne);
  const projectionConstant =
    mOne * mOne + coneConstant * qOne;
  const rho = (latitude) =>
    (semiMajorAxis *
      Math.sqrt(
        projectionConstant - coneConstant * q(latitude)
      )) /
    coneConstant;

  return {
    centralMeridian,
    coneConstant,
    eccentricity,
    projectionConstant,
    q,
    rhoAtOrigin: rho(latitudeOfOrigin),
    semiMajorAxis
  };
}

const CHINA_ALBERS = chinaAlbersParameters();

function inverseAuthalicLatitude(targetQ) {
  let lower = -Math.PI / 2 + 1e-9;
  let upper = Math.PI / 2 - 1e-9;

  for (let iteration = 0; iteration < 64; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (CHINA_ALBERS.q(middle) < targetQ) {
      lower = middle;
    } else {
      upper = middle;
    }
  }

  return (lower + upper) / 2;
}

function inverseChinaAlbers([x, y]) {
  const {
    centralMeridian,
    coneConstant,
    projectionConstant,
    rhoAtOrigin,
    semiMajorAxis
  } = CHINA_ALBERS;
  const rho = Math.hypot(x, rhoAtOrigin - y);
  const theta = Math.atan2(x, rhoAtOrigin - y);
  const targetQ =
    (projectionConstant -
      Math.pow((rho * coneConstant) / semiMajorAxis, 2)) /
    coneConstant;
  const latitude = inverseAuthalicLatitude(targetQ);
  const longitude =
    centralMeridian + theta / coneConstant;
  return [longitude / DEGREES, latitude / DEGREES];
}

function parallelName(latitude) {
  if (latitude === 0) return "Equator";
  if (latitude === 23.437) return "Tropic of Cancer";
  return `${Math.abs(latitude)} degrees ${
    latitude < 0 ? "south" : "north"
  }`;
}

function meridianName(unwrappedLongitude) {
  const longitude =
    unwrappedLongitude > 180
      ? unwrappedLongitude - 360
      : unwrappedLongitude;
  if (longitude === 0) return "Prime Meridian";
  if (longitude === 180 || longitude === -180) {
    return "180 degrees east";
  }
  return `${Math.abs(longitude)} degrees ${
    longitude < 0 ? "west" : "east"
  }`;
}

function lineBounds(points) {
  const xValues = points.map(([x]) => x);
  const yValues = points.map(([, y]) => y);
  return {
    left: Math.min(...xValues),
    right: Math.max(...xValues),
    bottom: Math.min(...yValues),
    top: Math.max(...yValues)
  };
}

function segmentIntersection(a, b, c, d) {
  const denominator =
    (a[0] - b[0]) * (c[1] - d[1]) -
    (a[1] - b[1]) * (c[0] - d[0]);
  if (Math.abs(denominator) < 1e-14) return undefined;

  const lineProgress =
    ((a[0] - c[0]) * (c[1] - d[1]) -
      (a[1] - c[1]) * (c[0] - d[0])) /
    denominator;
  const otherProgress =
    -(
      (a[0] - b[0]) * (a[1] - c[1]) -
      (a[1] - b[1]) * (a[0] - c[0])
    ) / denominator;

  if (
    lineProgress < -1e-8 ||
    lineProgress > 1 + 1e-8 ||
    otherProgress < -1e-8 ||
    otherProgress > 1 + 1e-8
  ) {
    return undefined;
  }

  return [
    a[0] + lineProgress * (b[0] - a[0]),
    a[1] + lineProgress * (b[1] - a[1])
  ];
}

function polylineIntersection(first, second) {
  for (
    let firstIndex = 0;
    firstIndex < first.length - 1;
    firstIndex += 1
  ) {
    for (
      let secondIndex = 0;
      secondIndex < second.length - 1;
      secondIndex += 1
    ) {
      const intersection = segmentIntersection(
        first[firstIndex],
        first[firstIndex + 1],
        second[secondIndex],
        second[secondIndex + 1]
      );
      if (intersection) return intersection;
    }
  }
  return undefined;
}

function nearestPolylineJoin(first, second) {
  let nearest;

  for (const firstPoint of first) {
    for (const secondPoint of second) {
      const distance = Math.hypot(
        firstPoint[0] - secondPoint[0],
        firstPoint[1] - secondPoint[1]
      );
      if (!nearest || distance < nearest.distance) {
        nearest = {
          distance,
          point: [
            (firstPoint[0] + secondPoint[0]) / 2,
            (firstPoint[1] + secondPoint[1]) / 2
          ]
        };
      }
    }
  }

  return nearest;
}

function selectMeridian(
  graticuleGeometries,
  topology,
  unwrappedLongitude
) {
  const expectedName = meridianName(unwrappedLongitude);
  let candidates = graticuleGeometries.filter(
    (geometry) => geometry.properties?.NAME === expectedName
  );

  // The standard-map topology stores the two sides of the map seam as
  // separate geometries. One high-resolution file labels the left seam
  // "15 degrees west", although it represents the same -30° meridian.
  if (unwrappedLongitude === -30) {
    candidates = graticuleGeometries.filter((geometry) => {
      const bounds = lineBounds(
        geometryPaths(topology, geometry)[0] ?? []
      );
      return (
        geometry.properties?.NAME === "30 degrees west" ||
        geometry.properties?.NAME === "15 degrees west"
      ) && bounds.right < 0;
    });
  }
  if (unwrappedLongitude === 330) {
    candidates = graticuleGeometries.filter((geometry) => {
      const bounds = lineBounds(
        geometryPaths(topology, geometry)[0] ?? []
      );
      return (
        geometry.properties?.NAME === "30 degrees west" ||
        geometry.properties?.NAME === "15 degrees west"
      ) && bounds.left > 0;
    });
  }

  const geometry = candidates[0];
  if (!geometry) {
    throw new Error(
      `Missing meridian ${unwrappedLongitude} (${expectedName})`
    );
  }
  return geometryPaths(topology, geometry)[0];
}

function parallelCandidates(
  graticuleGeometries,
  topology,
  latitude
) {
  const name = parallelName(latitude);
  const candidates = graticuleGeometries.filter(
    (geometry) => geometry.properties?.NAME === name
  );
  if (candidates.length === 0) {
    throw new Error(`Missing parallel ${latitude} (${name})`);
  }
  return candidates.map(
    (geometry) => geometryPaths(topology, geometry)[0]
  );
}

function buildProjectionGrid(
  topology,
  graticuleName,
  latitudes
) {
  const graticule = topology.objects[graticuleName];
  if (!graticule) {
    throw new Error(`Missing graticule object: ${graticuleName}`);
  }

  const meridians = new Map(
    WORLD_LONGITUDES.map((longitude) => [
      longitude,
      selectMeridian(
        graticule.geometries,
        topology,
        longitude
      )
    ])
  );
  const parallels = new Map(
    latitudes.map((latitude) => [
      latitude,
      parallelCandidates(
        graticule.geometries,
        topology,
        latitude
      )
    ])
  );
  const nodes = new Map();

  for (const longitude of WORLD_LONGITUDES) {
    for (const latitude of latitudes) {
      const meridian = meridians.get(longitude);
      const candidates = parallels.get(latitude);
      const intersection = candidates
        .map((parallel) =>
          polylineIntersection(meridian, parallel)
        )
        .find(Boolean);
      const nearest = candidates
        .map((parallel) =>
          nearestPolylineJoin(meridian, parallel)
        )
        .sort((first, second) => first.distance - second.distance)[0];
      const node = intersection ?? nearest?.point;
      if (!node) {
        throw new Error(
          `Unable to intersect ${longitude}°, ${latitude}°`
        );
      }
      nodes.set(`${longitude},${latitude}`, node);
    }
  }

  return { latitudes, nodes };
}

function bilinearPoint(corners, horizontal, vertical) {
  const [bottomLeft, bottomRight, topLeft, topRight] =
    corners;
  return [
    bottomLeft[0] * (1 - horizontal) * (1 - vertical) +
      bottomRight[0] * horizontal * (1 - vertical) +
      topLeft[0] * (1 - horizontal) * vertical +
      topRight[0] * horizontal * vertical,
    bottomLeft[1] * (1 - horizontal) * (1 - vertical) +
      bottomRight[1] * horizontal * (1 - vertical) +
      topLeft[1] * (1 - horizontal) * vertical +
      topRight[1] * horizontal * vertical
  ];
}

function inverseBilinear(point, corners) {
  let horizontal = 0.5;
  let vertical = 0.5;

  for (let iteration = 0; iteration < 18; iteration += 1) {
    const projected = bilinearPoint(
      corners,
      horizontal,
      vertical
    );
    const epsilon = 1e-5;
    const projectedHorizontal = bilinearPoint(
      corners,
      horizontal + epsilon,
      vertical
    );
    const projectedVertical = bilinearPoint(
      corners,
      horizontal,
      vertical + epsilon
    );
    const errorX = point[0] - projected[0];
    const errorY = point[1] - projected[1];
    const horizontalX =
      (projectedHorizontal[0] - projected[0]) / epsilon;
    const horizontalY =
      (projectedHorizontal[1] - projected[1]) / epsilon;
    const verticalX =
      (projectedVertical[0] - projected[0]) / epsilon;
    const verticalY =
      (projectedVertical[1] - projected[1]) / epsilon;
    const determinant =
      horizontalX * verticalY - horizontalY * verticalX;

    if (Math.abs(determinant) < 1e-14) break;
    horizontal +=
      (errorX * verticalY - errorY * verticalX) /
      determinant;
    vertical +=
      (errorY * horizontalX - errorX * horizontalY) /
      determinant;

    if (
      !Number.isFinite(horizontal) ||
      !Number.isFinite(vertical)
    ) {
      return undefined;
    }
  }

  const reprojected = bilinearPoint(
    corners,
    horizontal,
    vertical
  );
  return {
    horizontal,
    vertical,
    error: Math.hypot(
      point[0] - reprojected[0],
      point[1] - reprojected[1]
    )
  };
}

function createGridInverse(grid) {
  const longitudeCells = WORLD_LONGITUDES.slice(0, -1).map(
    (longitude, index) => [
      longitude,
      WORLD_LONGITUDES[index + 1]
    ]
  );
  const latitudeCells = grid.latitudes
    .slice(0, -1)
    .map((latitude, index) => [
      latitude,
      grid.latitudes[index + 1]
    ]);

  return (point) => {
    let bestCandidate;

    for (const [leftLongitude, rightLongitude] of longitudeCells) {
      for (const [bottomLatitude, topLatitude] of latitudeCells) {
        const corners = [
          grid.nodes.get(
            `${leftLongitude},${bottomLatitude}`
          ),
          grid.nodes.get(
            `${rightLongitude},${bottomLatitude}`
          ),
          grid.nodes.get(`${leftLongitude},${topLatitude}`),
          grid.nodes.get(`${rightLongitude},${topLatitude}`)
        ];
        if (corners.some((corner) => !corner)) continue;

        const inverse = inverseBilinear(point, corners);
        if (!inverse) continue;
        const outside =
          Math.max(0, -inverse.horizontal) +
          Math.max(0, inverse.horizontal - 1) +
          Math.max(0, -inverse.vertical) +
          Math.max(0, inverse.vertical - 1);
        const score = outside * 10_000 + inverse.error;
        if (!bestCandidate || score < bestCandidate.score) {
          bestCandidate = {
            longitude:
              leftLongitude +
              inverse.horizontal *
                (rightLongitude - leftLongitude),
            latitude:
              bottomLatitude +
              inverse.vertical *
                (topLatitude - bottomLatitude),
            score
          };
        }
      }
    }

    if (!bestCandidate) return undefined;
    const longitude =
      bestCandidate.longitude > 180
        ? bestCandidate.longitude - 360
        : bestCandidate.longitude;
    return [
      Math.max(-180, Math.min(180, longitude)),
      Math.max(-89.5, Math.min(89.5, bestCandidate.latitude))
    ];
  };
}

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let deltaX = end[0] - x;
  let deltaY = end[1] - y;

  if (deltaX !== 0 || deltaY !== 0) {
    const progress =
      ((point[0] - x) * deltaX +
        (point[1] - y) * deltaY) /
      (deltaX * deltaX + deltaY * deltaY);
    if (progress > 1) {
      x = end[0];
      y = end[1];
    } else if (progress > 0) {
      x += deltaX * progress;
      y += deltaY * progress;
    }
  }

  deltaX = point[0] - x;
  deltaY = point[1] - y;
  return deltaX * deltaX + deltaY * deltaY;
}

function simplifyPath(points, tolerance) {
  if (points.length <= 2) return points;
  const squaredTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop();
    let furthestDistance = squaredTolerance;
    let furthestIndex;

    for (
      let index = startIndex + 1;
      index < endIndex;
      index += 1
    ) {
      const distance = squaredSegmentDistance(
        points[index],
        points[startIndex],
        points[endIndex]
      );
      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthestIndex = index;
      }
    }

    if (furthestIndex !== undefined) {
      keep[furthestIndex] = 1;
      stack.push([startIndex, furthestIndex]);
      stack.push([furthestIndex, endIndex]);
    }
  }

  return points.filter((_, index) => keep[index] === 1);
}

function splitAntimeridian(points) {
  if (points.length < 2) return [];
  const paths = [];
  let current = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const previous = points[index - 1];
    if (Math.abs(point[0] - previous[0]) > 120) {
      if (current.length > 1) paths.push(current);
      current = [point];
    } else {
      current.push(point);
    }
  }
  if (current.length > 1) paths.push(current);
  return paths;
}

function roundedCoordinate([longitude, latitude]) {
  return [
    Number(longitude.toFixed(4)),
    Number(latitude.toFixed(4))
  ];
}

function transformPaths(paths, inverse, tolerance) {
  return paths
    .flatMap((path) => {
      const transformed = path
        .map(inverse)
        .filter(
          (point) =>
            point &&
            Number.isFinite(point[0]) &&
            Number.isFinite(point[1])
        );
      return splitAntimeridian(transformed);
    })
    .map((path) => simplifyPath(path, tolerance))
    .filter((path) => path.length > 1)
    .map((path) => path.map(roundedCoordinate));
}

function validateCoordinates(data) {
  const collections = [
    data.worldBoundaries,
    data.prcNationalBoundaries,
    data.prcProvinceBoundaries,
    data.southChinaSeaDashes
  ];
  const coordinates = collections.flat(2);

  if (
    coordinates.some(
      ([longitude, latitude]) =>
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
    )
  ) {
    throw new Error("Generated boundary data contains invalid coordinates");
  }
  if (data.southChinaSeaDashes.length !== 10) {
    throw new Error(
      `Expected 10 maritime segments, found ${data.southChinaSeaDashes.length}`
    );
  }
  if (data.prcProvinceBoundaries.length < 50) {
    throw new Error("Province boundary extraction is unexpectedly sparse");
  }
}

async function main() {
  const [chinaTopology, worldTopology, maritimeTopology] =
    await Promise.all([
      fetchTopology(SOURCE_URLS.china),
      fetchTopology(SOURCE_URLS.world),
      fetchTopology(SOURCE_URLS.maritime)
    ]);

  const worldGrid = buildProjectionGrid(
    worldTopology,
    WORLD_GRATICULE_NAME,
    WORLD_LATITUDES
  );
  const maritimeGrid = buildProjectionGrid(
    maritimeTopology,
    MARITIME_GRATICULE_NAME,
    MARITIME_LATITUDES
  );
  const inverseWorld = createGridInverse(worldGrid);
  const inverseMaritime = createGridInverse(maritimeGrid);

  const worldBoundaries = transformPaths(
    WORLD_LAYER_NAMES.flatMap((layerName) =>
      objectPaths(worldTopology, layerName)
    ),
    inverseWorld,
    0.11
  );
  const prcNationalBoundaries = transformPaths(
    CHINA_LAYER_NAMES.nationalBoundary.flatMap((layerName) =>
      objectPaths(chinaTopology, layerName)
    ),
    inverseChinaAlbers,
    0.025
  );
  const prcProvinceBoundaries = transformPaths(
    CHINA_LAYER_NAMES.provinceBoundary.flatMap((layerName) =>
      objectPaths(chinaTopology, layerName)
    ),
    inverseChinaAlbers,
    0.035
  );
  const importantIslandPoints = objectPoints(
    chinaTopology,
    CHINA_LAYER_NAMES.importantIslands
  )
    .map(inverseChinaAlbers)
    .map(roundedCoordinate);
  const southChinaSeaDashes = transformPaths(
    objectPaths(maritimeTopology, MARITIME_LAYER_NAME),
    inverseMaritime,
    0.008
  );

  const data = {
    schemaVersion: 1,
    generatedOn: "2026-07-30",
    coordinateSystem: "WGS84 longitude/latitude degrees",
    source: {
      authority: "中华人民共和国自然资源部标准地图服务系统",
      serviceUrl: "http://bzdt.ch.mnr.gov.cn/",
      chinaTopologyUrl: SOURCE_URLS.china,
      worldTopologyUrl: SOURCE_URLS.world,
      maritimeTopologyUrl: SOURCE_URLS.maritime,
      chinaProjection:
        "Albers equal-area conic; Krasovsky 1940; lon_0=110; lat_1=25; lat_2=47",
      worldReprojection:
        "Inverse interpolation against the source standard-map graticule"
    },
    representation: {
      prcBoundary:
        "中国国界、未定国界与国内海岸线",
      provinceBoundary: "省级行政界全",
      maritimeLine:
        "南海诸岛归属范围线（10段，含东海有关线段）",
      importantIslands: "重要岛点"
    },
    worldBoundaries,
    prcNationalBoundaries,
    prcProvinceBoundaries,
    importantIslandPoints,
    southChinaSeaDashes
  };

  validateCoordinates(data);
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(data)}\n`,
    "utf8"
  );

  const coordinateCount = [
    worldBoundaries,
    prcNationalBoundaries,
    prcProvinceBoundaries,
    southChinaSeaDashes
  ]
    .flat(2)
    .length;
  console.log(
    JSON.stringify(
      {
        output: OUTPUT_PATH,
        bytes: Buffer.byteLength(JSON.stringify(data)),
        coordinateCount,
        worldPaths: worldBoundaries.length,
        prcNationalPaths: prcNationalBoundaries.length,
        provincePaths: prcProvinceBoundaries.length,
        importantIslandPoints: importantIslandPoints.length,
        maritimeSegments: southChinaSeaDashes.length
      },
      null,
      2
    )
  );
}

await main();
