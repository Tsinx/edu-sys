import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  Curve,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties
} from "react";
import {
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import administrativeBoundaryData from "./data/prc-administrative-boundaries.json";

export interface GlobeCoordinate {
  latitude: number;
  longitude: number;
}

export interface GlobeLocation extends GlobeCoordinate {
  id: string;
  name: string;
  color?: string;
  showLabel?: boolean;
  kind?: "port" | "chokepoint" | "city";
  visibilityScope?: "all" | "global" | "featured";
}

export interface GlobeRoute {
  id: string;
  label: string;
  points: readonly GlobeCoordinate[];
  color?: string;
  animated?: boolean;
  interpolation?: "smooth" | "piecewise-geodesic";
}

export type GlobeMapMode = "natural" | "administrative";
export type GlobeAdministrativeDetail = "country" | "province";
export type GlobeRouteView = "global" | "featured";
export type GlobeShippingLaneDetail =
  | "major"
  | "regional"
  | "all";
export type GlobeShippingLaneTier =
  | "major"
  | "middle"
  | "minor";
export type GlobeShippingLaneState =
  | "loading"
  | "ready"
  | "error";

export interface GlobeShippingLanePath {
  id: string;
  tier: GlobeShippingLaneTier;
  points: readonly GlobeCoordinate[];
}

export interface GlobeMovingVessel {
  id: string;
  coordinate: GlobeCoordinate;
  headingTo?: GlobeCoordinate;
  color?: string;
  label?: string;
  progress?: number;
}

export interface InteractiveEarthGlobeHandle {
  focusLocation: (locationId: string) => void;
  focusCoordinate: (
    coordinate: GlobeCoordinate,
    distance?: number,
    durationMs?: number
  ) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export interface InteractiveEarthGlobeProps {
  locations?: readonly GlobeLocation[];
  routes?: readonly GlobeRoute[];
  shippingLanes?: readonly GlobeShippingLanePath[];
  activeLocationIds?: readonly string[];
  visibleLocationIds?: readonly string[];
  visibleRouteIds?: readonly string[];
  activeLocationColor?: string;
  activeLocationColors?: Readonly<Record<string, string>>;
  initialFocus?: GlobeCoordinate;
  textureUrl?: string;
  fallbackImageUrl?: string;
  minDistance?: number;
  maxDistance?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  forceFallback?: boolean;
  showControls?: boolean;
  showGraticule?: boolean;
  showLabels?: boolean;
  mapMode?: GlobeMapMode;
  defaultMapMode?: GlobeMapMode;
  administrativeDetail?: GlobeAdministrativeDetail;
  defaultAdministrativeDetail?: GlobeAdministrativeDetail;
  showMapModeToggle?: boolean;
  showRouteModeToggle?: boolean;
  routeView?: GlobeRouteView;
  defaultRouteView?: GlobeRouteView;
  shippingLaneDetail?: GlobeShippingLaneDetail;
  defaultShippingLaneDetail?: GlobeShippingLaneDetail;
  shippingLaneState?: GlobeShippingLaneState;
  movingVessel?: GlobeMovingVessel;
  cameraTrackingCoordinate?: GlobeCoordinate;
  cameraTrackingDistance?: number;
  showProvinceBoundaries?: boolean;
  showSouthChinaSeaLine?: boolean;
  administrativeFocus?: GlobeCoordinate;
  focusOnAdministrativeMode?: boolean;
  globalRouteFocus?: GlobeCoordinate;
  featuredRouteFocus?: GlobeCoordinate;
  globalRouteDistance?: number;
  featuredRouteDistance?: number;
  eyebrow?: string;
  title?: string;
  interactionHint?: string;
  attribution?: string;
  administrativeAttribution?: string;
  shippingLaneAttribution?: string;
  featuredRouteAttribution?: string;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  onLocationSelect?: (location: GlobeLocation) => void;
  onMapModeChange?: (mode: GlobeMapMode) => void;
  onRouteViewChange?: (view: GlobeRouteView) => void;
  onShippingLaneDetailChange?: (
    detail: GlobeShippingLaneDetail
  ) => void;
  onAdministrativeDetailChange?: (
    detail: GlobeAdministrativeDetail
  ) => void;
}

type StageState = "loading" | "ready" | "error";

interface MarkerVisual {
  group: Group;
  point: Mesh;
  stemMaterial: MeshBasicMaterial;
  pointMaterial: MeshBasicMaterial;
  ringMaterial: MeshBasicMaterial;
  baseColor: Color;
  visibilityScope: NonNullable<GlobeLocation["visibilityScope"]>;
}

interface RoutePulse {
  curve: Curve<Vector3>;
  mesh: Mesh;
  offset: number;
  speed: number;
}

interface MarkerPulse {
  locationId: string;
  ring: Mesh;
  material: MeshBasicMaterial;
  phase: number;
}

interface MarkerLabel {
  sprite: Sprite;
  width: number;
  height: number;
}

interface CameraTween {
  from: Vector3;
  to: Vector3;
  startedAt: number;
  duration: number;
}

type BoundaryMaterial =
  | LineBasicMaterial
  | MeshBasicMaterial
  | PointsMaterial;

interface BoundaryVisual {
  object: Object3D;
  material: BoundaryMaterial;
  baseOpacity: number;
  kind: "world" | "prc" | "province" | "maritime" | "island";
}

interface ShippingLaneVisual {
  object: LineSegments;
  material: LineBasicMaterial;
  tier: GlobeShippingLaneTier;
}

interface MovingVesselVisual {
  group: Group;
  glow: Mesh;
  glowMaterial: MeshBasicMaterial;
  accentMaterials: Array<MeshBasicMaterial | MeshPhongMaterial>;
}

interface GlobeRuntime {
  camera: PerspectiveCamera;
  controls: OrbitControls;
  renderer: WebGLRenderer;
  scene: Scene;
  initialCameraPosition: Vector3;
  locationVectors: Map<string, Vector3>;
  markerVisuals: Map<string, MarkerVisual>;
  earthMaterial: MeshPhongMaterial;
  boundaryVisuals: BoundaryVisual[];
  mapMode: GlobeMapMode;
  administrativeDetail: GlobeAdministrativeDetail;
  mapModeBlend: number;
  provinceBlend: number;
  showProvinceBoundaries: boolean;
  showSouthChinaSeaLine: boolean;
  routeView: GlobeRouteView;
  shippingLaneDetail: GlobeShippingLaneDetail;
  shippingLaneVisuals: ShippingLaneVisual[];
  featuredRouteObjects: Object3D[];
  movingVesselVisual: MovingVesselVisual;
  cameraTween?: CameraTween;
}

type BoundaryCoordinate = readonly [
  longitude: number,
  latitude: number
];

interface AdministrativeBoundaryData {
  schemaVersion: number;
  generatedOn: string;
  source: {
    authority: string;
    serviceUrl: string;
  };
  worldBoundaries: readonly (readonly BoundaryCoordinate[])[];
  prcNationalBoundaries: readonly (readonly BoundaryCoordinate[])[];
  prcProvinceBoundaries: readonly (readonly BoundaryCoordinate[])[];
  importantIslandPoints: readonly BoundaryCoordinate[];
  southChinaSeaDashes: readonly (readonly BoundaryCoordinate[])[];
}

const ADMINISTRATIVE_BOUNDARIES =
  administrativeBoundaryData as unknown as AdministrativeBoundaryData;

const DEFAULT_TEXTURE = "/globe-assets/earth-blue-marble-2048.webp";
const DEFAULT_ADMINISTRATIVE_FOCUS: GlobeCoordinate = {
  latitude: 29,
  longitude: 104
};
const DEFAULT_ADMINISTRATIVE_DISTANCE = 2.55;
const DEFAULT_GLOBAL_ROUTE_FOCUS: GlobeCoordinate = {
  latitude: 8,
  longitude: -18
};
const DEFAULT_FEATURED_ROUTE_FOCUS: GlobeCoordinate = {
  latitude: 20,
  longitude: 70
};
const DEFAULT_GLOBAL_ROUTE_DISTANCE = 3.82;
const DEFAULT_FEATURED_ROUTE_DISTANCE = 2.75;
const DEFAULT_MIN_DISTANCE = 1.72;
const DEFAULT_MAX_DISTANCE = 4.6;
const ACTIVE_COLOR = new Color("#ffbd66");
const EMPTY_ACTIVE_LOCATION_COLORS: Readonly<Record<string, string>> = {};
const NATURAL_EARTH_COLOR = new Color("#ffffff");
const ADMINISTRATIVE_EARTH_COLOR = new Color("#86a1ad");
const NATURAL_EARTH_EMISSIVE = new Color("#021424");
const ADMINISTRATIVE_EARTH_EMISSIVE = new Color("#061b2a");
const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

function isValidCoordinate(point: GlobeCoordinate) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function latLngToVector3(
  point: GlobeCoordinate,
  radius = 1
): Vector3 {
  const latitude = MathUtils.degToRad(point.latitude);
  const longitude = MathUtils.degToRad(point.longitude);
  const latitudeRadius = Math.cos(latitude) * radius;

  return new Vector3(
    latitudeRadius * Math.cos(longitude),
    Math.sin(latitude) * radius,
    -latitudeRadius * Math.sin(longitude)
  );
}

function sphericalInterpolate(
  start: Vector3,
  end: Vector3,
  progress: number,
  radius: number
) {
  const startUnit = start.clone().normalize();
  const endUnit = end.clone().normalize();
  const dot = MathUtils.clamp(startUnit.dot(endUnit), -1, 1);
  const angle = Math.acos(dot);

  if (angle < 0.0001) {
    return startUnit.multiplyScalar(radius);
  }

  const denominator = Math.sin(angle);
  const startWeight = Math.sin((1 - progress) * angle) / denominator;
  const endWeight = Math.sin(progress * angle) / denominator;

  return startUnit
    .multiplyScalar(startWeight)
    .add(endUnit.multiplyScalar(endWeight))
    .normalize()
    .multiplyScalar(radius);
}

class PiecewiseGeodesicCurve extends Curve<Vector3> {
  private readonly points: Vector3[];
  private readonly cumulativeDistances: number[];
  private readonly totalDistance: number;
  private readonly radius: number;

  constructor(
    coordinates: readonly GlobeCoordinate[],
    radius: number
  ) {
    super();
    this.points = coordinates
      .filter(isValidCoordinate)
      .map((coordinate) => latLngToVector3(coordinate));
    this.radius = radius;
    this.cumulativeDistances = [0];
    let totalDistance = 0;
    for (let index = 1; index < this.points.length; index += 1) {
      const previous = this.points[index - 1];
      const current = this.points[index];
      if (!previous || !current) continue;
      totalDistance += previous.angleTo(current);
      this.cumulativeDistances.push(totalDistance);
    }
    this.totalDistance = totalDistance;
  }

  override getPoint(progress: number, target = new Vector3()) {
    const firstPoint = this.points[0];
    if (!firstPoint) return target.set(0, 0, 0);
    if (this.points.length === 1 || this.totalDistance <= 0) {
      return target
        .copy(firstPoint)
        .normalize()
        .multiplyScalar(this.radius);
    }
    const targetDistance =
      MathUtils.clamp(progress, 0, 1) * this.totalDistance;
    let low = 1;
    let high = this.cumulativeDistances.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (
        (this.cumulativeDistances[middle] ?? this.totalDistance) <
        targetDistance
      ) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    const endIndex = low;
    const startIndex = Math.max(0, endIndex - 1);
    const segmentStart =
      this.cumulativeDistances[startIndex] ?? 0;
    const segmentEnd =
      this.cumulativeDistances[endIndex] ?? this.totalDistance;
    const segmentProgress =
      segmentEnd > segmentStart
        ? (targetDistance - segmentStart) /
          (segmentEnd - segmentStart)
        : 0;
    const segmentStartPoint =
      this.points[startIndex] ?? firstPoint;
    const segmentEndPoint =
      this.points[endIndex] ?? segmentStartPoint;
    return target.copy(
      sphericalInterpolate(
        segmentStartPoint,
        segmentEndPoint,
        segmentProgress,
        this.radius
      )
    );
  }

  override getPointAt(progress: number, target = new Vector3()) {
    return this.getPoint(progress, target);
  }
}

function createRouteCurve(route: GlobeRoute): Curve<Vector3> | undefined {
  if (route.interpolation === "piecewise-geodesic") {
    const validPoints = route.points.filter(isValidCoordinate);
    return validPoints.length > 1
      ? new PiecewiseGeodesicCurve(validPoints, 1.032)
      : undefined;
  }
  const samples: Vector3[] = [];

  route.points.forEach((point, pointIndex) => {
    const next = route.points[pointIndex + 1];
    if (!next || !isValidCoordinate(point) || !isValidCoordinate(next)) {
      return;
    }

    const start = latLngToVector3(point);
    const end = latLngToVector3(next);
    const angle = start.angleTo(end);
    const segmentSamples = Math.max(6, Math.ceil(angle / 0.08));

    for (let sampleIndex = 0; sampleIndex < segmentSamples; sampleIndex += 1) {
      if (pointIndex > 0 && sampleIndex === 0) continue;
      const progress = sampleIndex / segmentSamples;
      const altitude = 1.018 + Math.sin(progress * Math.PI) * 0.025;
      samples.push(sphericalInterpolate(start, end, progress, altitude));
    }
  });

  const lastPoint = route.points.at(-1);
  if (lastPoint && isValidCoordinate(lastPoint)) {
    samples.push(latLngToVector3(lastPoint, 1.018));
  }

  return samples.length > 1
    ? new CatmullRomCurve3(samples, false, "centripetal", 0.5)
    : undefined;
}

const SHIPPING_LANE_STYLE: Record<
  GlobeShippingLaneTier,
  { color: string; opacity: number; radius: number }
> = {
  major: {
    color: "#5ee7ff",
    opacity: 0.9,
    radius: 1.028
  },
  middle: {
    color: "#61bdd2",
    opacity: 0.43,
    radius: 1.025
  },
  minor: {
    color: "#6c92a3",
    opacity: 0.2,
    radius: 1.022
  }
};

function createShippingLaneVisuals(
  shippingLanes: readonly GlobeShippingLanePath[]
) {
  const pathsByTier = new Map<
    GlobeShippingLaneTier,
    GlobeShippingLanePath[]
  >([
    ["major", []],
    ["middle", []],
    ["minor", []]
  ]);
  shippingLanes.forEach((path) => {
    pathsByTier.get(path.tier)?.push(path);
  });

  return (
    ["major", "middle", "minor"] as const
  ).flatMap((tier) => {
    const paths = pathsByTier.get(tier) ?? [];
    if (paths.length === 0) return [];
    const positions: number[] = [];
    const style = SHIPPING_LANE_STYLE[tier];
    paths.forEach((path) => {
      for (let index = 1; index < path.points.length; index += 1) {
        const startCoordinate = path.points[index - 1];
        const endCoordinate = path.points[index];
        if (
          !startCoordinate ||
          !endCoordinate ||
          !isValidCoordinate(startCoordinate) ||
          !isValidCoordinate(endCoordinate)
        ) {
          continue;
        }
        const start = latLngToVector3(startCoordinate);
        const end = latLngToVector3(endCoordinate);
        const segmentCount = Math.max(
          1,
          Math.ceil(
            start.angleTo(end) / MathUtils.degToRad(1.25)
          )
        );
        let previous = start
          .clone()
          .normalize()
          .multiplyScalar(style.radius);
        for (
          let segmentIndex = 1;
          segmentIndex <= segmentCount;
          segmentIndex += 1
        ) {
          const current = sphericalInterpolate(
            start,
            end,
            segmentIndex / segmentCount,
            style.radius
          );
          positions.push(
            previous.x,
            previous.y,
            previous.z,
            current.x,
            current.y,
            current.z
          );
          previous = current;
        }
      }
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    );
    const material = new LineBasicMaterial({
      blending: AdditiveBlending,
      color: style.color,
      opacity: style.opacity,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    });
    const object = new LineSegments(geometry, material);
    object.renderOrder = 5;
    object.userData.shippingLaneTier = tier;
    object.userData.shippingLaneBatch = true;
    return [{ object, material, tier } satisfies ShippingLaneVisual];
  });
}

function shippingLaneTierVisible(
  tier: GlobeShippingLaneTier,
  detail: GlobeShippingLaneDetail
) {
  if (tier === "major") return true;
  if (tier === "middle") return detail !== "major";
  return detail === "all";
}

function createGraticule() {
  const group = new Group();
  const material = new LineBasicMaterial({
    color: "#7de7ff",
    opacity: 0.12,
    transparent: true,
    depthWrite: false
  });
  const radius = 1.006;

  for (let latitude = -75; latitude <= 75; latitude += 15) {
    const points: Vector3[] = [];
    for (let longitude = -180; longitude < 180; longitude += 3) {
      points.push(latLngToVector3({ latitude, longitude }, radius));
    }
    group.add(
      new LineLoop(
        new BufferGeometry().setFromPoints(points),
        material
      )
    );
  }

  for (let longitude = -165; longitude <= 180; longitude += 15) {
    const points: Vector3[] = [];
    for (let latitude = -90; latitude <= 90; latitude += 3) {
      points.push(latLngToVector3({ latitude, longitude }, radius));
    }
    group.add(
      new Line(
        new BufferGeometry().setFromPoints(points),
        material
      )
    );
  }

  return group;
}

function coordinateToGlobePoint(
  coordinate: BoundaryCoordinate,
  radius: number
) {
  return latLngToVector3(
    {
      latitude: coordinate[1],
      longitude: coordinate[0]
    },
    radius
  );
}

function createBoundaryLineLayer(
  paths: readonly (readonly BoundaryCoordinate[])[],
  {
    color,
    opacity,
    radius
  }: {
    color: string;
    opacity: number;
    radius: number;
  }
) {
  const positions: number[] = [];

  paths.forEach((path) => {
    for (let index = 1; index < path.length; index += 1) {
      const previous = path[index - 1];
      const current = path[index];
      if (!previous || !current) continue;
      const start = coordinateToGlobePoint(previous, radius);
      const end = coordinateToGlobePoint(current, radius);
      positions.push(start.x, start.y, start.z, end.x, end.y, end.z);
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3)
  );
  const material = new LineBasicMaterial({
    blending: AdditiveBlending,
    color,
    opacity: 0,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });
  const object = new LineSegments(geometry, material);
  object.renderOrder = 4;
  return { object, material, baseOpacity: opacity };
}

function densifyBoundaryPath(
  path: readonly BoundaryCoordinate[],
  radius: number
) {
  const points: Vector3[] = [];

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    if (!previous || !current) continue;
    const start = coordinateToGlobePoint(previous, 1);
    const end = coordinateToGlobePoint(current, 1);
    const angle = start.angleTo(end);
    const sampleCount = Math.max(
      1,
      Math.ceil(angle / MathUtils.degToRad(0.5))
    );

    if (points.length === 0) {
      points.push(start.clone().multiplyScalar(radius));
    }
    for (let sample = 1; sample <= sampleCount; sample += 1) {
      points.push(
        sphericalInterpolate(
          start,
          end,
          sample / sampleCount,
          radius
        )
      );
    }
  }

  return points;
}

function createBoundaryTubeLayer(
  paths: readonly (readonly BoundaryCoordinate[])[],
  {
    color,
    opacity,
    radius,
    thickness
  }: {
    color: string;
    opacity: number;
    radius: number;
    thickness: number;
  }
) {
  const group = new Group();
  const material = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color,
    opacity: 0,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });

  paths.forEach((path) => {
    const points = densifyBoundaryPath(path, radius);
    if (points.length < 2) return;
    const curve = new CatmullRomCurve3(
      points,
      false,
      "centripetal",
      0.32
    );
    const mesh = new Mesh(
      new TubeGeometry(
        curve,
        Math.max(8, points.length * 2),
        thickness,
        5,
        false
      ),
      material
    );
    mesh.renderOrder = 6;
    group.add(mesh);
  });

  return { object: group, material, baseOpacity: opacity };
}

function createImportantIslandLayer(
  coordinates: readonly BoundaryCoordinate[]
) {
  const group = new Group();
  const geometry = new SphereGeometry(0.0052, 9, 7);
  const material = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#ffd27a",
    opacity: 0,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });

  coordinates.forEach((coordinate) => {
    const point = coordinateToGlobePoint(coordinate, 1.032);
    const marker = new Mesh(geometry, material);
    marker.position.copy(point);
    marker.renderOrder = 7;
    group.add(marker);
  });

  return { object: group, material, baseOpacity: 0.88 };
}

function createAdministrativeBoundaryVisuals() {
  const world = createBoundaryLineLayer(
    ADMINISTRATIVE_BOUNDARIES.worldBoundaries,
    {
      color: "#91edff",
      opacity: 0.74,
      radius: 1.015
    }
  );
  const prc = createBoundaryTubeLayer(
    ADMINISTRATIVE_BOUNDARIES.prcNationalBoundaries,
    {
      color: "#ff7182",
      opacity: 1,
      radius: 1.023,
      thickness: 0.003
    }
  );
  const province = createBoundaryLineLayer(
    ADMINISTRATIVE_BOUNDARIES.prcProvinceBoundaries,
    {
      color: "#ffe1a1",
      opacity: 0.82,
      radius: 1.027
    }
  );
  const maritime = createBoundaryTubeLayer(
    ADMINISTRATIVE_BOUNDARIES.southChinaSeaDashes,
    {
      color: "#ffad55",
      opacity: 1,
      radius: 1.034,
      thickness: 0.0042
    }
  );
  const island = createImportantIslandLayer(
    ADMINISTRATIVE_BOUNDARIES.importantIslandPoints
  );

  return [
    { ...world, kind: "world" },
    { ...prc, kind: "prc" },
    { ...province, kind: "province" },
    { ...maritime, kind: "maritime" },
    { ...island, kind: "island" }
  ] satisfies BoundaryVisual[];
}

function createStarField() {
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  let seed = 9137;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let index = 0; index < starCount; index += 1) {
    const radius = 5.5 + random() * 8;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  return new Points(
    geometry,
    new PointsMaterial({
      color: "#d9f6ff",
      opacity: 0.72,
      size: 0.018,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false
    })
  );
}

function createLabelSprite(name: string, color: Color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (!context) return undefined;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(3, 24, 42, 0.82)";
  context.strokeStyle = color.getStyle();
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(8, 8, 496, 112, 30);
  context.fill();
  context.stroke();
  context.fillStyle = color.getStyle();
  context.beginPath();
  context.arc(50, 64, 11, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#effcff";
  context.font =
    '700 45px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
  context.textBaseline = "middle";
  context.fillText(name, 82, 66, 400);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false
  });
  const sprite = new Sprite(material);
  sprite.scale.set(0.46, 0.115, 1);
  return sprite;
}

function locationColor(location: GlobeLocation) {
  if (location.color) return new Color(location.color);
  if (location.kind === "chokepoint") return new Color("#ffb86b");
  if (location.kind === "city") return new Color("#a3c7ff");
  return new Color("#67e8f9");
}

function createMarker(
  location: GlobeLocation,
  active: boolean,
  showLabel: boolean,
  activeColor: Color
) {
  const group = new Group();
  const baseColor = locationColor(location);
  const currentColor = active ? activeColor : baseColor;
  const normal = latLngToVector3(location).normalize();
  const markerPosition = normal.clone().multiplyScalar(1.055);

  const stemMaterial = new MeshBasicMaterial({
    color: currentColor,
    opacity: 0.72,
    transparent: true
  });
  const stem = new Mesh(
    new CylinderGeometry(0.006, 0.006, 0.08, 10),
    stemMaterial
  );
  stem.position.copy(markerPosition);
  stem.quaternion.setFromUnitVectors(UP, normal);
  group.add(stem);

  const pointMaterial = new MeshBasicMaterial({
    color: currentColor,
    toneMapped: false
  });
  const point = new Mesh(new SphereGeometry(0.026, 18, 14), pointMaterial);
  point.position.copy(normal.clone().multiplyScalar(1.098));
  point.scale.setScalar(active ? 1.4 : 1);
  group.add(point);

  const ringMaterial = new MeshBasicMaterial({
    color: currentColor,
    opacity: 0.52,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });
  const ring = new Mesh(new RingGeometry(0.035, 0.052, 36), ringMaterial);
  ring.position.copy(normal.clone().multiplyScalar(1.105));
  ring.quaternion.setFromUnitVectors(FORWARD, normal);
  group.add(ring);

  const hitTarget = new Mesh(
    new SphereGeometry(0.075, 12, 8),
    new MeshBasicMaterial({
      opacity: 0,
      transparent: true,
      depthWrite: false
    })
  );
  hitTarget.position.copy(point.position);
  hitTarget.userData.locationId = location.id;
  group.add(hitTarget);

  let labelSprite: Sprite | undefined;
  if (showLabel && location.showLabel !== false) {
    const label = createLabelSprite(location.name, currentColor);
    if (label) {
      label.position.copy(normal.clone().multiplyScalar(1.22));
      group.add(label);
      labelSprite = label;
    }
  }

  return {
    group,
    hitTarget,
    labelSprite,
    markerPulse: {
      locationId: location.id,
      ring,
      material: ringMaterial,
      phase: Math.abs(location.longitude + location.latitude) / 180
    } satisfies MarkerPulse,
    visual: {
      group,
      point,
      stemMaterial,
      pointMaterial,
      ringMaterial,
      baseColor,
      visibilityScope: location.visibilityScope ?? "all"
    } satisfies MarkerVisual
  };
}

function createMovingVesselVisual(): MovingVesselVisual {
  const group = new Group();
  group.visible = false;

  const hullMaterial = new MeshPhongMaterial({
    color: "#ffb04d",
    emissive: "#9a4308",
    emissiveIntensity: 0.55,
    shininess: 24
  });
  const deckMaterial = new MeshPhongMaterial({
    color: "#f7e7ca",
    emissive: "#5d4331",
    emissiveIntensity: 0.32,
    shininess: 18
  });
  const mastMaterial = new MeshBasicMaterial({
    color: "#ffe6a7",
    toneMapped: false
  });

  const hull = new Mesh(
    new BoxGeometry(0.064, 0.024, 0.112),
    hullMaterial
  );
  hull.position.set(0, 0.026, -0.006);
  group.add(hull);

  const bow = new Mesh(
    new ConeGeometry(0.038, 0.074, 5),
    hullMaterial
  );
  bow.rotation.x = Math.PI / 2;
  bow.position.set(0, 0.026, 0.084);
  group.add(bow);

  const deck = new Mesh(
    new BoxGeometry(0.046, 0.025, 0.052),
    deckMaterial
  );
  deck.position.set(0, 0.05, -0.016);
  group.add(deck);

  [-0.032, 0.018].forEach((zPosition) => {
    const mast = new Mesh(
      new CylinderGeometry(0.003, 0.003, 0.105, 7),
      mastMaterial
    );
    mast.position.set(0, 0.104, zPosition);
    group.add(mast);
  });

  const wakeMaterial = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#dffbff",
    opacity: 0.66,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });
  [-0.018, 0.018].forEach((xPosition) => {
    const wake = new Mesh(
      new BoxGeometry(0.008, 0.004, 0.09),
      wakeMaterial
    );
    wake.position.set(xPosition, 0.008, -0.105);
    wake.rotation.y = xPosition < 0 ? -0.13 : 0.13;
    group.add(wake);
  });

  const glowMaterial = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#ffb04d",
    opacity: 0.72,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });
  const glow = new Mesh(
    new RingGeometry(0.06, 0.078, 48),
    glowMaterial
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.008;
  group.add(glow);

  group.traverse((object) => {
    object.renderOrder = 12;
  });

  return {
    group,
    glow,
    glowMaterial,
    accentMaterials: [hullMaterial, mastMaterial]
  };
}

function updateMovingVesselVisual(
  visual: MovingVesselVisual,
  vessel: GlobeMovingVessel,
  elapsedSeconds: number
) {
  const position = latLngToVector3(vessel.coordinate, 1.085);
  const outward = position.clone().normalize();
  const headingPoint =
    vessel.headingTo && isValidCoordinate(vessel.headingTo)
    ? latLngToVector3(vessel.headingTo)
    : undefined;
  const forward = headingPoint
    ? headingPoint
        .sub(outward.clone().multiplyScalar(headingPoint.dot(outward)))
        .normalize()
    : new Vector3(0, 0, 1);
  const right = outward.clone().cross(forward).normalize();
  const correctedForward = right.clone().cross(outward).normalize();
  const orientation = new Matrix4().makeBasis(
    right,
    outward,
    correctedForward
  );
  const color = new Color(vessel.color ?? "#ffb04d");

  visual.group.visible = true;
  visual.group.position.copy(position);
  visual.group.quaternion.setFromRotationMatrix(orientation);
  visual.group.scale.setScalar(1 + Math.sin(elapsedSeconds * 4.8) * 0.055);
  visual.glow.scale.setScalar(1 + (Math.sin(elapsedSeconds * 5.4) + 1) * 0.1);
  visual.glowMaterial.opacity = 0.48 + (Math.sin(elapsedSeconds * 5.4) + 1) * 0.16;
  visual.glowMaterial.color.copy(color);
  visual.accentMaterials.forEach((material) => material.color.copy(color));
}

function createAtmosphere() {
  return new Mesh(
    new SphereGeometry(1.09, 72, 48),
    new ShaderMaterial({
      blending: AdditiveBlending,
      depthWrite: false,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.78 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.7);
          gl_FragColor = vec4(0.20, 0.78, 1.0, intensity * 0.9);
        }
      `,
      side: BackSide,
      transparent: true,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `
    })
  );
}

function disposeObject(object: Object3D) {
  const renderable = object as Object3D & {
    geometry?: BufferGeometry;
    material?:
      | (Material & { map?: { dispose: () => void } | null })
      | Array<Material & { map?: { dispose: () => void } | null }>;
  };
  renderable.geometry?.dispose();
  if (Array.isArray(renderable.material)) {
    renderable.material.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
  } else {
    renderable.material?.map?.dispose();
    renderable.material?.dispose();
  }
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export const InteractiveEarthGlobe = forwardRef<
  InteractiveEarthGlobeHandle,
  InteractiveEarthGlobeProps
>(function InteractiveEarthGlobe(
  {
    locations = [],
    routes = [],
    shippingLanes = [],
    activeLocationIds = [],
    visibleLocationIds,
    visibleRouteIds,
    activeLocationColor = `#${ACTIVE_COLOR.getHexString()}`,
    activeLocationColors = EMPTY_ACTIVE_LOCATION_COLORS,
    initialFocus = DEFAULT_GLOBAL_ROUTE_FOCUS,
    textureUrl = DEFAULT_TEXTURE,
    fallbackImageUrl = DEFAULT_TEXTURE,
    minDistance = DEFAULT_MIN_DISTANCE,
    maxDistance = DEFAULT_MAX_DISTANCE,
    autoRotate = true,
    autoRotateSpeed = 0.46,
    forceFallback = false,
    showControls = true,
    showGraticule = true,
    showLabels = true,
    mapMode,
    defaultMapMode = "natural",
    administrativeDetail,
    defaultAdministrativeDetail = "province",
    showMapModeToggle = true,
    showRouteModeToggle = true,
    routeView,
    defaultRouteView = "global",
    shippingLaneDetail,
    defaultShippingLaneDetail = "major",
    shippingLaneState = "ready",
    movingVessel,
    cameraTrackingCoordinate,
    cameraTrackingDistance = 2.34,
    showProvinceBoundaries = true,
    showSouthChinaSeaLine = true,
    administrativeFocus = DEFAULT_ADMINISTRATIVE_FOCUS,
    focusOnAdministrativeMode = true,
    globalRouteFocus = DEFAULT_GLOBAL_ROUTE_FOCUS,
    featuredRouteFocus = DEFAULT_FEATURED_ROUTE_FOCUS,
    globalRouteDistance = DEFAULT_GLOBAL_ROUTE_DISTANCE,
    featuredRouteDistance = DEFAULT_FEATURED_ROUTE_DISTANCE,
    eyebrow = "INTERACTIVE EARTH",
    title = "全球航路",
    interactionHint = "拖动旋转 · 滚轮或双指缩放",
    attribution = "地球底图：NASA Blue Marble · 地点按经纬度定位",
    administrativeAttribution =
      "界线：自然资源部标准地图服务 · 对外公开前需依法履行地图审核",
    shippingLaneAttribution =
      "航线：P. Benden / CIA · Global Shipping Lanes v1.3.1（2012 / 2022）",
    featuredRouteAttribution =
      "LL3：OOCL 2023 港序 · Eurostat SeaRoute 5 km 网络",
    ariaLabel = "可旋转和缩放的三维地球仪",
    className = "",
    style,
    onLocationSelect,
    onMapModeChange,
    onRouteViewChange,
    onShippingLaneDetailChange,
    onAdministrativeDetailChange
  },
  forwardedRef
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GlobeRuntime | undefined>(undefined);
  const callbackRef = useRef(onLocationSelect);
  const activeIdsRef = useRef(activeLocationIds);
  const visibleLocationIdsRef = useRef(visibleLocationIds);
  const visibleRouteIdsRef = useRef(visibleRouteIds);
  const autoRotatingRef = useRef(autoRotate);
  const movingVesselRef = useRef(movingVessel);
  const cameraTrackingCoordinateRef = useRef(cameraTrackingCoordinate);
  const cameraTrackingDistanceRef = useRef(cameraTrackingDistance);
  const pendingFocusRef = useRef<string | undefined>(undefined);
  const previousRouteViewRef =
    useRef<GlobeRouteView>(defaultRouteView);
  const [stageState, setStageState] = useState<StageState>("loading");
  const [autoRotating, setAutoRotating] = useState(autoRotate);
  const [internalMapMode, setInternalMapMode] =
    useState<GlobeMapMode>(defaultMapMode);
  const [internalRouteView, setInternalRouteView] =
    useState<GlobeRouteView>(defaultRouteView);
  const [
    internalShippingLaneDetail,
    setInternalShippingLaneDetail
  ] = useState<GlobeShippingLaneDetail>(
    defaultShippingLaneDetail
  );
  const [
    internalAdministrativeDetail,
    setInternalAdministrativeDetail
  ] = useState<GlobeAdministrativeDetail>(
    defaultAdministrativeDetail
  );
  const resolvedMapMode = mapMode ?? internalMapMode;
  const resolvedRouteView = routeView ?? internalRouteView;
  const resolvedShippingLaneDetail =
    shippingLaneDetail ?? internalShippingLaneDetail;
  const resolvedAdministrativeDetail =
    administrativeDetail ?? internalAdministrativeDetail;

  callbackRef.current = onLocationSelect;
  activeIdsRef.current = activeLocationIds;
  visibleLocationIdsRef.current = visibleLocationIds;
  visibleRouteIdsRef.current = visibleRouteIds;
  autoRotatingRef.current = autoRotating;
  movingVesselRef.current = movingVessel;
  cameraTrackingCoordinateRef.current = cameraTrackingCoordinate;
  cameraTrackingDistanceRef.current = cameraTrackingDistance;

  const changeAdministrativeDetail = (
    nextDetail: GlobeAdministrativeDetail
  ) => {
    if (administrativeDetail === undefined) {
      setInternalAdministrativeDetail(nextDetail);
    }
    onAdministrativeDetailChange?.(nextDetail);
  };

  const startCameraTween = (
    targetPosition: Vector3,
    duration = 700
  ) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.controls.autoRotate = false;
    runtime.cameraTween = {
      from: runtime.camera.position.clone(),
      to: targetPosition,
      startedAt: performance.now(),
      duration
    };
  };

  const focusLocation = (locationId: string) => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      pendingFocusRef.current = locationId;
      return;
    }
    const vector = runtime.locationVectors.get(locationId);
    if (!vector) return;
    startCameraTween(vector.clone().normalize().multiplyScalar(2.3), 850);
  };

  const focusCoordinate = (
    coordinate: GlobeCoordinate,
    distance = DEFAULT_ADMINISTRATIVE_DISTANCE,
    duration = 850
  ) => {
    const runtime = runtimeRef.current;
    if (!runtime || !isValidCoordinate(coordinate)) return;
    const safeDistance = MathUtils.clamp(
      distance,
      runtime.controls.minDistance,
      runtime.controls.maxDistance
    );
    startCameraTween(
      latLngToVector3(coordinate, safeDistance),
      duration
    );
  };

  const focusRouteView = (nextView: GlobeRouteView) => {
    autoRotatingRef.current = false;
    setAutoRotating(false);
    const coordinate =
      nextView === "global"
        ? globalRouteFocus
        : featuredRouteFocus;
    const distance =
      nextView === "global"
        ? globalRouteDistance
        : featuredRouteDistance;
    focusCoordinate(
      isValidCoordinate(coordinate)
        ? coordinate
        : nextView === "global"
          ? DEFAULT_GLOBAL_ROUTE_FOCUS
          : DEFAULT_FEATURED_ROUTE_FOCUS,
      distance,
      950
    );
  };

  const changeRouteView = (nextView: GlobeRouteView) => {
    if (routeView === undefined) {
      setInternalRouteView(nextView);
    }
    focusRouteView(nextView);
    onRouteViewChange?.(nextView);
  };

  const changeShippingLaneDetail = (
    nextDetail: GlobeShippingLaneDetail
  ) => {
    if (shippingLaneDetail === undefined) {
      setInternalShippingLaneDetail(nextDetail);
    }
    onShippingLaneDetailChange?.(nextDetail);
  };

  const focusAdministrativeMap = () => {
    autoRotatingRef.current = false;
    setAutoRotating(false);
    focusCoordinate(
      isValidCoordinate(administrativeFocus)
        ? administrativeFocus
        : DEFAULT_ADMINISTRATIVE_FOCUS,
      DEFAULT_ADMINISTRATIVE_DISTANCE,
      950
    );
  };

  const changeMapMode = (nextMode: GlobeMapMode) => {
    if (mapMode === undefined) {
      setInternalMapMode(nextMode);
    }
    if (
      nextMode === "administrative" &&
      focusOnAdministrativeMode
    ) {
      focusAdministrativeMap();
    }
    onMapModeChange?.(nextMode);
  };

  const resetView = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    startCameraTween(runtime.initialCameraPosition.clone(), 850);
  };

  const zoomBy = (factor: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const currentDistance = runtime.camera.position.length();
    const nextDistance = MathUtils.clamp(
      currentDistance * factor,
      runtime.controls.minDistance,
      runtime.controls.maxDistance
    );
    startCameraTween(
      runtime.camera.position.clone().normalize().multiplyScalar(nextDistance),
      430
    );
  };

  useImperativeHandle(
    forwardedRef,
    () => ({
      focusLocation,
      focusCoordinate,
      resetView,
      zoomIn: () => zoomBy(0.78),
      zoomOut: () => zoomBy(1.28)
    }),
    []
  );

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const activeSet = new Set(activeLocationIds);
    runtime.markerVisuals.forEach((visual, locationId) => {
      const active = activeSet.has(locationId);
      const color = active
        ? new Color(activeLocationColors[locationId] ?? activeLocationColor)
        : visual.baseColor;
      visual.stemMaterial.color.copy(color);
      visual.pointMaterial.color.copy(color);
      visual.ringMaterial.color.copy(color);
      visual.point.scale.setScalar(active ? 1.4 : 1);
    });
  }, [activeLocationColor, activeLocationColors, activeLocationIds]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.controls.autoRotate = autoRotating;
    }
  }, [autoRotating]);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAutoRotating(autoRotate && !prefersReducedMotion);
  }, [autoRotate]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.mapMode = resolvedMapMode;
    runtime.administrativeDetail =
      resolvedAdministrativeDetail;
    runtime.showProvinceBoundaries =
      showProvinceBoundaries;
    runtime.showSouthChinaSeaLine =
      showSouthChinaSeaLine;
  }, [
    resolvedAdministrativeDetail,
    resolvedMapMode,
    showProvinceBoundaries,
    showSouthChinaSeaLine
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime.routeView = resolvedRouteView;
      runtime.shippingLaneDetail =
        resolvedShippingLaneDetail;
    }
    if (
      previousRouteViewRef.current !== resolvedRouteView &&
      routeView !== undefined
    ) {
      focusRouteView(resolvedRouteView);
    }
    previousRouteViewRef.current = resolvedRouteView;
  }, [
    resolvedRouteView,
    resolvedShippingLaneDetail,
    routeView
  ]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (forceFallback) {
      runtimeRef.current = undefined;
      mount.replaceChildren();
      setStageState("error");
      return;
    }

    let disposed = false;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let isVisible = true;
    const routePulses: RoutePulse[] = [];
    const featuredRouteObjects: Object3D[] = [];
    const markerPulses: MarkerPulse[] = [];
    const markerLabels: MarkerLabel[] = [];
    const hitTargets: Mesh[] = [];
    const locationVectors = new Map<string, Vector3>();
    const markerVisuals = new Map<string, MarkerVisual>();
    const activeSet = new Set(activeIdsRef.current);
    const pointerStart = new Vector2();
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const safeFocus = isValidCoordinate(initialFocus)
      ? initialFocus
      : DEFAULT_GLOBAL_ROUTE_FOCUS;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    setStageState("loading");
    setAutoRotating(autoRotate && !prefersReducedMotion);

    try {
      const scene = new Scene();
      const camera = new PerspectiveCamera(37, 1, 0.08, 60);
      const requestedInitialDistance =
        resolvedRouteView === "global"
          ? globalRouteDistance
          : featuredRouteDistance;
      const initialDistance = MathUtils.clamp(
        requestedInitialDistance,
        Math.max(1.45, minDistance),
        Math.max(Math.max(1.45, minDistance) + 0.2, maxDistance)
      );
      const initialCameraPosition = latLngToVector3(
        safeFocus,
        initialDistance
      );
      camera.position.copy(initialCameraPosition);
      camera.lookAt(0, 0, 0);

      const renderer = new WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.domElement.setAttribute("role", "img");
      renderer.domElement.setAttribute("aria-label", ariaLabel);
      renderer.domElement.className = "earth-globe__canvas";
      mount.replaceChildren(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.055;
      controls.enablePan = false;
      controls.minDistance = Math.max(1.45, minDistance);
      controls.maxDistance = Math.max(controls.minDistance + 0.2, maxDistance);
      controls.rotateSpeed = 0.48;
      controls.zoomSpeed = 0.72;
      controls.autoRotate = autoRotate && !prefersReducedMotion;
      controls.autoRotateSpeed = autoRotateSpeed;
      controls.zoomToCursor = true;

      const initialMapModeBlend =
        resolvedMapMode === "administrative" ? 1 : 0;
      const earthMaterial = new MeshPhongMaterial({
        color: new Color().lerpColors(
          NATURAL_EARTH_COLOR,
          ADMINISTRATIVE_EARTH_COLOR,
          initialMapModeBlend
        ),
        emissive: new Color().lerpColors(
          NATURAL_EARTH_EMISSIVE,
          ADMINISTRATIVE_EARTH_EMISSIVE,
          initialMapModeBlend
        ),
        emissiveIntensity:
          0.2 + initialMapModeBlend * 0.12,
        shininess: 13 - initialMapModeBlend * 7,
        specular: new Color("#2b6f91")
      });
      const boundaryVisuals =
        createAdministrativeBoundaryVisuals();
      const shippingLaneVisuals =
        createShippingLaneVisuals(shippingLanes);
      const movingVesselVisual = createMovingVesselVisual();
      renderer.domElement.dataset.shippingLaneBatches = String(
        shippingLaneVisuals.length
      );
      const runtime: GlobeRuntime = {
        camera,
        controls,
        renderer,
        scene,
        initialCameraPosition,
        locationVectors,
        markerVisuals,
        earthMaterial,
        boundaryVisuals,
        mapMode: resolvedMapMode,
        administrativeDetail:
          resolvedAdministrativeDetail,
        mapModeBlend: initialMapModeBlend,
        provinceBlend:
          resolvedAdministrativeDetail === "province" ? 1 : 0,
        showProvinceBoundaries,
        showSouthChinaSeaLine,
        routeView: resolvedRouteView,
        shippingLaneDetail: resolvedShippingLaneDetail,
        shippingLaneVisuals,
        featuredRouteObjects,
        movingVesselVisual
      };
      runtimeRef.current = runtime;

      scene.add(createStarField());
      scene.add(new AmbientLight(0x92c9e6, 1.35));
      const keyLight = new DirectionalLight(0xffffff, 3.1);
      keyLight.position.set(4, 2.5, 4);
      scene.add(keyLight);
      const rimLight = new DirectionalLight(0x2da9ff, 2.2);
      rimLight.position.set(-4, -1, -2);
      scene.add(rimLight);

      const earth = new Mesh(
        new SphereGeometry(1, 96, 64),
        earthMaterial
      );
      earth.rotation.y = 0;
      scene.add(earth);
      scene.add(createAtmosphere());
      scene.add(movingVesselVisual.group);

      if (showGraticule) {
        scene.add(createGraticule());
      }
      boundaryVisuals.forEach((visual) => {
        scene.add(visual.object);
      });
      shippingLaneVisuals.forEach((visual) => {
        scene.add(visual.object);
      });

      const orbitalRing = new Mesh(
        new TorusGeometry(1.35, 0.004, 8, 180),
        new MeshBasicMaterial({
          blending: AdditiveBlending,
          color: "#4fdcf7",
          opacity: 0.24,
          transparent: true,
          depthWrite: false,
          toneMapped: false
        })
      );
      orbitalRing.rotation.set(
        MathUtils.degToRad(72),
        MathUtils.degToRad(-8),
        MathUtils.degToRad(18)
      );
      scene.add(orbitalRing);

      locations
        .filter(isValidCoordinate)
        .forEach((location, index) => {
          const vector = latLngToVector3(location);
          locationVectors.set(location.id, vector);
          const marker = createMarker(
            location,
            activeSet.has(location.id),
            showLabels,
            new Color(
              activeLocationColors[location.id] ?? activeLocationColor
            )
          );
          marker.markerPulse.phase += index / Math.max(locations.length, 1);
          markerPulses.push(marker.markerPulse);
          if (marker.labelSprite) {
            markerLabels.push({
              sprite: marker.labelSprite,
              width: 0.46,
              height: 0.115
            });
          }
          hitTargets.push(marker.hitTarget);
          markerVisuals.set(location.id, marker.visual);
          scene.add(marker.group);
        });

      routes.forEach((route, routeIndex) => {
        const curve = createRouteCurve(route);
        if (!curve) return;
        const color = new Color(route.color ?? "#5de7ff");
        const tube = new Mesh(
          new TubeGeometry(
            curve,
            Math.min(
              2600,
              Math.max(120, route.points.length * 2)
            ),
            0.006,
            7,
            false
          ),
          new MeshBasicMaterial({
            blending: AdditiveBlending,
            color,
            opacity: 0.82,
            transparent: true,
            depthWrite: false,
            toneMapped: false
          })
        );
        tube.userData.featuredRouteId = route.id;
        scene.add(tube);
        featuredRouteObjects.push(tube);

        if (route.animated !== false) {
          [0, 0.33, 0.66].forEach((offset, pulseIndex) => {
            const pulse = new Mesh(
              new SphereGeometry(0.016 + pulseIndex * 0.002, 12, 10),
              new MeshBasicMaterial({
                blending: AdditiveBlending,
                color,
                toneMapped: false
              })
            );
            pulse.userData.featuredRouteId = route.id;
            pulse.position.copy(curve.getPointAt(offset));
            scene.add(pulse);
            featuredRouteObjects.push(pulse);
            routePulses.push({
              curve,
              mesh: pulse,
              offset,
              speed: 0.024 + routeIndex * 0.004
            });
          });
        }
      });

      const onControlStart = () => {
        runtime.cameraTween = undefined;
      };
      controls.addEventListener("start", onControlStart);

      const onPointerDown = (event: PointerEvent) => {
        pointerStart.set(event.clientX, event.clientY);
      };
      const hitLocation = (event: PointerEvent) => {
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1
        );
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(hitTargets, false)[0]?.object
          .userData.locationId as string | undefined;
      };
      const onPointerMove = (event: PointerEvent) => {
        renderer.domElement.style.cursor = hitLocation(event)
          ? "pointer"
          : "grab";
      };
      const onPointerUp = (event: PointerEvent) => {
        const movement = pointerStart.distanceTo(
          new Vector2(event.clientX, event.clientY)
        );
        if (movement > 7) return;
        const locationId = hitLocation(event);
        if (!locationId) return;
        const location = locations.find((item) => item.id === locationId);
        if (!location) return;
        focusLocation(locationId);
        callbackRef.current?.(location);
      };
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);

      const resize = () => {
        const bounds = mount.getBoundingClientRect();
        const width = Math.max(1, bounds.width);
        const height = Math.max(1, bounds.height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry?.isIntersecting ?? true;
        },
        { threshold: 0.01 }
      );
      intersectionObserver.observe(mount);

      const startedAt = performance.now();
      let previousFrameAt = startedAt;
      const renderFrame = (now: number) => {
        if (disposed) return;
        const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
        const frameDeltaMs = MathUtils.clamp(now - previousFrameAt, 0, 64);
        previousFrameAt = now;
        const trackingCoordinate = cameraTrackingCoordinateRef.current;

        if (
          trackingCoordinate &&
          isValidCoordinate(trackingCoordinate)
        ) {
          runtime.cameraTween = undefined;
          controls.autoRotate = false;
          const trackingDistance = MathUtils.clamp(
            cameraTrackingDistanceRef.current,
            controls.minDistance,
            controls.maxDistance
          );
          const targetPosition = latLngToVector3(
            trackingCoordinate,
            trackingDistance
          );
          const followWeight = prefersReducedMotion
            ? 1
            : 1 - Math.exp(-frameDeltaMs / 620);
          camera.position.lerp(targetPosition, followWeight);
          camera.lookAt(0, 0, 0);
        } else if (runtime.cameraTween) {
          const progress = MathUtils.clamp(
            (now - runtime.cameraTween.startedAt) /
              runtime.cameraTween.duration,
            0,
            1
          );
          camera.position
            .copy(runtime.cameraTween.from)
            .lerp(
              runtime.cameraTween.to,
              easeInOutCubic(progress)
            );
          camera.lookAt(0, 0, 0);
          if (progress >= 1) {
            runtime.cameraTween = undefined;
            controls.autoRotate = autoRotatingRef.current;
          }
        }

        const transitionWeight = prefersReducedMotion ? 1 : 0.09;
        const mapModeTarget =
          runtime.mapMode === "administrative" ? 1 : 0;
        const provinceTarget =
          runtime.administrativeDetail === "province" &&
          runtime.showProvinceBoundaries
            ? 1
            : 0;
        runtime.mapModeBlend = MathUtils.lerp(
          runtime.mapModeBlend,
          mapModeTarget,
          transitionWeight
        );
        runtime.provinceBlend = MathUtils.lerp(
          runtime.provinceBlend,
          provinceTarget,
          transitionWeight
        );
        earthMaterial.color.lerpColors(
          NATURAL_EARTH_COLOR,
          ADMINISTRATIVE_EARTH_COLOR,
          runtime.mapModeBlend
        );
        earthMaterial.emissive.lerpColors(
          NATURAL_EARTH_EMISSIVE,
          ADMINISTRATIVE_EARTH_EMISSIVE,
          runtime.mapModeBlend
        );
        earthMaterial.emissiveIntensity =
          0.2 + runtime.mapModeBlend * 0.12;
        earthMaterial.shininess =
          13 - runtime.mapModeBlend * 7;

        runtime.boundaryVisuals.forEach((visual) => {
          const detailOpacity =
            visual.kind === "province"
              ? runtime.provinceBlend
              : visual.kind === "maritime" &&
                  !runtime.showSouthChinaSeaLine
                ? 0
                : 1;
          const opacity =
            visual.baseOpacity *
            runtime.mapModeBlend *
            detailOpacity;
          visual.material.opacity = opacity;
          visual.object.visible = opacity > 0.002;
        });

        runtime.shippingLaneVisuals.forEach((visual) => {
          visual.object.visible =
            runtime.routeView === "global" &&
            shippingLaneTierVisible(
              visual.tier,
              runtime.shippingLaneDetail
            );
        });
        runtime.featuredRouteObjects.forEach((object) => {
          const visibleRouteIds = visibleRouteIdsRef.current;
          object.visible =
            runtime.routeView === "featured" &&
            (visibleRouteIds === undefined ||
              visibleRouteIds.includes(
                String(object.userData.featuredRouteId ?? "")
              ));
        });
        runtime.markerVisuals.forEach((visual, locationId) => {
          const visibleLocationIds = visibleLocationIdsRef.current;
          visual.group.visible =
            (visual.visibilityScope === "all" ||
              visual.visibilityScope === runtime.routeView) &&
            (visibleLocationIds === undefined ||
              visibleLocationIds.includes(locationId));
        });

        routePulses.forEach((pulse) => {
          const rawProgress =
            pulse.offset + elapsedSeconds * pulse.speed;
          const progress = ((rawProgress % 1) + 1) % 1;
          pulse.mesh.position.copy(pulse.curve.getPointAt(progress));
          const glow = 0.85 + Math.sin(elapsedSeconds * 5 + pulse.offset) * 0.22;
          pulse.mesh.scale.setScalar(glow);
        });

        markerPulses.forEach((pulse) => {
          const active = activeIdsRef.current.includes(pulse.locationId);
          const progress =
            (elapsedSeconds * (active ? 0.76 : 0.42) + pulse.phase) % 1;
          pulse.ring.scale.setScalar(
            1 + progress * (active ? 2.65 : 1.8)
          );
          pulse.material.opacity =
            (1 - progress) * (active ? 0.86 : 0.36);
        });

        runtime.markerVisuals.forEach((visual, locationId) => {
          if (!activeIdsRef.current.includes(locationId)) {
            visual.point.scale.setScalar(1);
            return;
          }
          const flash = 1.5 + (Math.sin(elapsedSeconds * 6.2) + 1) * 0.17;
          visual.point.scale.setScalar(flash);
        });

        const vessel = movingVesselRef.current;
        if (vessel && isValidCoordinate(vessel.coordinate)) {
          updateMovingVesselVisual(
            runtime.movingVesselVisual,
            vessel,
            elapsedSeconds
          );
          renderer.domElement.dataset.vesselVisible = "true";
          renderer.domElement.dataset.vesselProgress = String(
            MathUtils.clamp(vessel.progress ?? 0, 0, 1).toFixed(3)
          );
        } else {
          runtime.movingVesselVisual.group.visible = false;
          renderer.domElement.dataset.vesselVisible = "false";
          renderer.domElement.dataset.vesselProgress = "0.000";
        }
        renderer.domElement.dataset.cameraTracking = String(
          Boolean(
            trackingCoordinate && isValidCoordinate(trackingCoordinate)
          )
        );

        const labelScale = MathUtils.clamp(
          camera.position.length() / 2.85,
          0.62,
          1.35
        );
        markerLabels.forEach((label) => {
          label.sprite.scale.set(
            label.width * labelScale,
            label.height * labelScale,
            1
          );
        });

        orbitalRing.rotation.z += 0.00045;
        controls.update();
        if (isVisible) renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(renderFrame);
      };
      animationFrame = window.requestAnimationFrame(renderFrame);

      new TextureLoader()
        .loadAsync(textureUrl)
        .then((texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = SRGBColorSpace;
          texture.anisotropy = Math.min(
            8,
            renderer.capabilities.getMaxAnisotropy()
          );
          earthMaterial.map = texture;
          earthMaterial.needsUpdate = true;
          setStageState("ready");
          if (pendingFocusRef.current) {
            focusLocation(pendingFocusRef.current);
            pendingFocusRef.current = undefined;
          }
        })
        .catch(() => {
          if (!disposed) {
            renderer.domElement.style.display = "none";
            setStageState("error");
          }
        });

      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        controls.removeEventListener("start", onControlStart);
        controls.dispose();
        renderer.domElement.removeEventListener(
          "pointerdown",
          onPointerDown
        );
        renderer.domElement.removeEventListener(
          "pointermove",
          onPointerMove
        );
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        scene.traverse(disposeObject);
        earthMaterial.map?.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        if (runtimeRef.current === runtime) {
          runtimeRef.current = undefined;
        }
      };
    } catch {
      setStageState("error");
      return () => {
        disposed = true;
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        window.cancelAnimationFrame(animationFrame);
      };
    }
  }, [
    ariaLabel,
    autoRotateSpeed,
    forceFallback,
    locations,
    maxDistance,
    minDistance,
    routes,
    shippingLanes,
    showGraticule,
    showLabels,
    textureUrl
  ]);

  const routeDataIsLoading =
    resolvedRouteView === "global" &&
    shippingLaneState === "loading";
  const routeDataHasError =
    resolvedRouteView === "global" &&
    shippingLaneState === "error";
  const statusText =
    stageState === "error"
      ? "当前设备显示平面地球底图"
      : stageState === "loading"
        ? "正在加载地球底图"
        : routeDataIsLoading
          ? "正在加载全球航线数据"
          : routeDataHasError
            ? "全球航线暂不可用，节点仍可交互"
            : resolvedRouteView === "global"
              ? "全球航线图层已就绪"
              : resolvedMapMode === "administrative"
                ? "LL3 与行政边界图层已就绪"
                : "LL3 专题航线已就绪";
  const mapAttribution =
    resolvedMapMode === "administrative"
      ? administrativeAttribution
      : attribution;
  const routeAttribution =
    resolvedRouteView === "global"
      ? shippingLaneAttribution
      : featuredRouteAttribution;
  const visibleAttribution = `${mapAttribution} · ${routeAttribution}`;
  const shippingLaneBatchCount = new Set(
    shippingLanes.map((path) => path.tier)
  ).size;

  return (
    <section
      className={[
        "earth-globe",
        `earth-globe--${stageState}`,
        `earth-globe--map-${resolvedMapMode}`,
        className
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      role="region"
      aria-label={ariaLabel}
      data-map-mode={resolvedMapMode}
      data-route-view={resolvedRouteView}
      data-shipping-lane-detail={resolvedShippingLaneDetail}
      data-shipping-lane-batches={shippingLaneBatchCount}
      data-moving-vessel={movingVessel?.id ?? "none"}
      data-camera-tracking={Boolean(cameraTrackingCoordinate)}
      data-administrative-detail={
        resolvedAdministrativeDetail
      }
    >
      <img
        className="earth-globe__fallback"
        src={fallbackImageUrl}
        alt=""
        aria-hidden="true"
      />
      <div ref={mountRef} className="earth-globe__mount" />
      <div className="earth-globe__aura" aria-hidden="true" />
      <div className="earth-globe__grid" aria-hidden="true" />
      <header className="earth-globe__heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{interactionHint}</p>
      </header>
      {showMapModeToggle || showRouteModeToggle ? (
        <aside
          className="earth-globe__layer-panel"
          aria-label="地图与航线图层"
        >
          {showRouteModeToggle && (
            <>
              <div
                className="earth-globe__route-switch"
                role="group"
                aria-label="航线专题"
              >
                <button
                  type="button"
                  aria-pressed={resolvedRouteView === "global"}
                  onClick={() => changeRouteView("global")}
                >
                  全球航线
                </button>
                <button
                  type="button"
                  aria-pressed={resolvedRouteView === "featured"}
                  onClick={() => changeRouteView("featured")}
                >
                  LL3 专题
                </button>
              </div>
              {resolvedRouteView === "global" ? (
                <div className="earth-globe__shipping-options">
                  <div
                    className="earth-globe__shipping-density"
                    role="group"
                    aria-label="全球航线密度"
                  >
                    <span>航线密度</span>
                    <button
                      type="button"
                      disabled={shippingLaneState !== "ready"}
                      aria-pressed={
                        resolvedShippingLaneDetail === "major"
                      }
                      onClick={() =>
                        changeShippingLaneDetail("major")
                      }
                    >
                      主干
                    </button>
                    <button
                      type="button"
                      disabled={shippingLaneState !== "ready"}
                      aria-pressed={
                        resolvedShippingLaneDetail === "regional"
                      }
                      onClick={() =>
                        changeShippingLaneDetail("regional")
                      }
                    >
                      主干＋区域
                    </button>
                    <button
                      type="button"
                      disabled={shippingLaneState !== "ready"}
                      aria-pressed={
                        resolvedShippingLaneDetail === "all"
                      }
                      onClick={() =>
                        changeShippingLaneDetail("all")
                      }
                    >
                      全部
                    </button>
                  </div>
                  <div
                    className="earth-globe__shipping-legend"
                    aria-label="全球航线图例"
                  >
                    <span>
                      <i className="earth-globe__legend-major" />
                      Major 主干
                    </span>
                    {resolvedShippingLaneDetail !== "major" && (
                      <span>
                        <i className="earth-globe__legend-middle" />
                        Middle 区域
                      </span>
                    )}
                    {resolvedShippingLaneDetail === "all" && (
                      <span>
                        <i className="earth-globe__legend-minor" />
                        Minor 支线
                      </span>
                    )}
                  </div>
                  <p>
                    <strong>2012 航线 / 2022 矢量版</strong>
                    {shippingLaneState === "loading"
                      ? "全球数据延迟加载中；地球与节点仍可操作。"
                      : shippingLaneState === "error"
                        ? "全球数据加载失败；节点仍可交互，也可切换 LL3 专题继续观察。"
                        : "分级航路用于教学观察；非实时 AIS、非导航航迹。"}
                  </p>
                </div>
              ) : (
                <div className="earth-globe__shipping-options">
                  <div
                    className="earth-globe__shipping-legend"
                    aria-label="LL3航线图例"
                  >
                    <span>
                      <i className="earth-globe__legend-westbound" />
                      上海至北欧
                    </span>
                    <span>
                      <i className="earth-globe__legend-eastbound" />
                      欧洲返亚洲
                    </span>
                  </div>
                  <p>
                    <strong>OOCL 2023 港序</strong>
                    SeaRoute 5 km 海路及近岸校正；非实时 AIS、非导航航迹。
                  </p>
                </div>
              )}
            </>
          )}
          {showMapModeToggle && (
            <div
              className="earth-globe__map-switch"
              role="group"
              aria-label="地图显示模式"
            >
              <button
                type="button"
                aria-pressed={resolvedMapMode === "natural"}
                onClick={() => changeMapMode("natural")}
              >
                <span aria-hidden="true" />
                自然地图
              </button>
              <button
                type="button"
                aria-pressed={
                  resolvedMapMode === "administrative"
                }
                onClick={() => changeMapMode("administrative")}
              >
                <span aria-hidden="true" />
                行政地图
              </button>
            </div>
          )}
          {showMapModeToggle &&
            resolvedMapMode === "administrative" && (
            <div className="earth-globe__administrative-options">
              <div className="earth-globe__administrative-toolbar">
                {showProvinceBoundaries && (
                  <div
                    className="earth-globe__detail-switch"
                    role="group"
                    aria-label="行政边界层级"
                  >
                    <span>边界层级</span>
                    <button
                      type="button"
                      aria-pressed={
                        resolvedAdministrativeDetail === "country"
                      }
                      onClick={() =>
                        changeAdministrativeDetail("country")
                      }
                    >
                      国界
                    </button>
                    <button
                      type="button"
                      aria-pressed={
                        resolvedAdministrativeDetail === "province"
                      }
                      onClick={() =>
                        changeAdministrativeDetail("province")
                      }
                    >
                      省级界
                    </button>
                  </div>
                )}
                <button
                  className="earth-globe__administrative-focus"
                  type="button"
                  onClick={focusAdministrativeMap}
                  aria-label="聚焦中国全图"
                  title="聚焦中国全图"
                >
                  聚焦中国
                </button>
              </div>
              <div
                className="earth-globe__boundary-legend"
                aria-label="行政地图图例"
              >
                <span>
                  <i className="earth-globe__legend-world" />
                  世界行政界线
                </span>
                <span>
                  <i className="earth-globe__legend-prc" />
                  中国国界与海岸线
                </span>
                {resolvedAdministrativeDetail === "province" &&
                  showProvinceBoundaries && (
                    <span>
                      <i className="earth-globe__legend-province" />
                      中国省级界线
                    </span>
                  )}
                {showSouthChinaSeaLine && (
                  <span>
                    <i className="earth-globe__legend-maritime" />
                    南海断续线及东海有关线段
                  </span>
                )}
              </div>
              <p>
                <strong>PRC 标准地图依据</strong>
                中国界线取自自然资源部标准地图服务；三维教学可视化不替代地图审核。
              </p>
            </div>
            )}
        </aside>
      ) : (
        <div className="earth-globe__telemetry" aria-hidden="true">
          <span>LAT / LNG</span>
          <strong>GEOSPATIAL</strong>
          <i />
        </div>
      )}
      {showControls && (
        <div
          className="earth-globe__controls"
          role="group"
          aria-label="地球仪控制"
        >
          <button
            type="button"
            onClick={() => zoomBy(0.78)}
            aria-label="放大地球"
            title="放大"
          >
            <ZoomIn aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.28)}
            aria-label="缩小地球"
            title="缩小"
          >
            <ZoomOut aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setAutoRotating((current) => !current)}
            aria-label={autoRotating ? "暂停自动旋转" : "继续自动旋转"}
            aria-pressed={autoRotating}
            title={autoRotating ? "暂停自动旋转" : "继续自动旋转"}
          >
            {autoRotating ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="恢复初始视角"
            title="恢复初始视角"
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      )}
      <footer className="earth-globe__footer">
        <span className="earth-globe__status">
          {stageState === "loading" || routeDataIsLoading ? (
            <LoaderCircle className="earth-globe__loader" aria-hidden="true" />
          ) : (
            <i aria-hidden="true" />
          )}
          {statusText}
        </span>
        <span>{visibleAttribution}</span>
      </footer>
      <span className="earth-globe__sr-only" aria-live="polite">
        {statusText}
      </span>
    </section>
  );
});

InteractiveEarthGlobe.displayName = "InteractiveEarthGlobe";
