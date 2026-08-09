export interface PortScenePoint {
  x: number;
  y: number;
}

export interface PortSceneRectGeometry {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

export interface PortScenePolygonGeometry {
  type: "polygon";
  points: readonly PortScenePoint[];
}

export interface PortScenePolylineGeometry {
  type: "polyline";
  points: readonly PortScenePoint[];
}

export interface PortSceneCircleGeometry {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
}

export type PortScenePrimitiveGeometry =
  | PortSceneRectGeometry
  | PortScenePolygonGeometry
  | PortScenePolylineGeometry
  | PortSceneCircleGeometry;

export type PortSceneTone =
  | "base"
  | "detail"
  | "muted"
  | "accent"
  | "warning"
  | "window"
  | "cargo";

export interface PortSceneGeometryPart {
  geometry: PortScenePrimitiveGeometry;
  tone?: PortSceneTone;
}

export interface PortSceneGroupGeometry {
  type: "group";
  parts: readonly PortSceneGeometryPart[];
}

export type PortSceneGeometry =
  | PortScenePrimitiveGeometry
  | PortSceneGroupGeometry;

export interface PortSceneDetail {
  label: string;
  value: string;
}

export interface PortSceneMotion {
  path: readonly PortScenePoint[];
  durationMs: number;
  phase?: number;
  rotateToPath?: boolean;
}

export interface PortScenePosition extends PortScenePoint {
  rotation?: number;
}

export interface PortSceneLabelPosition extends PortScenePoint {
  anchor?: "start" | "middle" | "end";
}

export interface PortSceneEntity {
  id: string;
  layerId: string;
  category: string;
  label: string;
  geometry: PortSceneGeometry;
  appearance: string;
  details: readonly PortSceneDetail[];
  position?: PortScenePosition;
  labelPosition?: PortSceneLabelPosition;
  motion?: PortSceneMotion;
  selectable?: boolean;
  showLabel?: boolean;
}

export interface PortSceneEntityProjection {
  entityId: string;
  x?: number;
  y?: number;
  rotation?: number;
  operationalState?:
    | "idle"
    | "assigned"
    | "busy"
    | "waiting"
    | "fault"
    | "closed"
    | "moving"
    | "completed";
  statusLabel?: string;
}

export type PortSceneEntityHighlightKind =
  | "selected"
  | "planned"
  | "related"
  | "attention";

export interface PortSceneEntityHighlight {
  entityId: string;
  kind: PortSceneEntityHighlightKind;
}

export interface PortSceneLayer {
  id: string;
  label: string;
  order: number;
  visible?: boolean;
}

export interface PortSceneDefinition {
  id: string;
  version: string;
  title: string;
  width: number;
  height: number;
  layers: readonly PortSceneLayer[];
  entities: readonly PortSceneEntity[];
  attribution: string;
}

export interface PortSceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function primitiveBounds(
  geometry: PortScenePrimitiveGeometry
): PortSceneBounds {
  if (geometry.type === "rect") {
    return {
      minX: geometry.x,
      minY: geometry.y,
      maxX: geometry.x + geometry.width,
      maxY: geometry.y + geometry.height
    };
  }
  if (geometry.type === "circle") {
    return {
      minX: geometry.cx - geometry.r,
      minY: geometry.cy - geometry.r,
      maxX: geometry.cx + geometry.r,
      maxY: geometry.cy + geometry.r
    };
  }

  const xs = geometry.points.map((point) => point.x);
  const ys = geometry.points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  };
}

export function getGeometryBounds(
  geometry: PortSceneGeometry
): PortSceneBounds {
  if (geometry.type !== "group") return primitiveBounds(geometry);

  const bounds = geometry.parts.map((part) =>
    primitiveBounds(part.geometry)
  );
  return {
    minX: Math.min(...bounds.map((item) => item.minX)),
    minY: Math.min(...bounds.map((item) => item.minY)),
    maxX: Math.max(...bounds.map((item) => item.maxX)),
    maxY: Math.max(...bounds.map((item) => item.maxY))
  };
}

export function getEntityBounds(
  entity: PortSceneEntity
): PortSceneBounds {
  const bounds = getGeometryBounds(entity.geometry);
  const positions = entity.motion?.path.length
    ? entity.motion.path
    : [entity.position ?? { x: 0, y: 0 }];
  return {
    minX: Math.min(...positions.map((point) => point.x + bounds.minX)),
    minY: Math.min(...positions.map((point) => point.y + bounds.minY)),
    maxX: Math.max(...positions.map((point) => point.x + bounds.maxX)),
    maxY: Math.max(...positions.map((point) => point.y + bounds.maxY))
  };
}
