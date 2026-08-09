import type {
  PortSceneBounds,
  PortScenePoint
} from "./port-scene-types";

export const PORT_SCENE_MIN_SCALE = 0.55;
export const PORT_SCENE_MAX_SCALE = 4;
export const PORT_SCENE_ZOOM_FACTOR = 1.25;
export const PORT_SCENE_CLICK_THRESHOLD = 7;

export interface PortSceneView {
  x: number;
  y: number;
  scale: number;
}

export interface PortSceneExtent {
  width: number;
  height: number;
}

export function createFitView(
  extent: PortSceneExtent,
  paddingRatio = 0.08
): PortSceneView {
  const scale = 1 / (1 + paddingRatio * 2);
  return {
    x: (extent.width - extent.width * scale) / 2,
    y: (extent.height - extent.height * scale) / 2,
    scale
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function clampView(
  view: PortSceneView,
  extent: PortSceneExtent,
  minimumVisibleRatio = 0.1
): PortSceneView {
  const scale = clamp(
    view.scale,
    PORT_SCENE_MIN_SCALE,
    PORT_SCENE_MAX_SCALE
  );
  const transformedWidth = extent.width * scale;
  const transformedHeight = extent.height * scale;
  const minimumVisibleX = Math.min(
    transformedWidth,
    extent.width * minimumVisibleRatio
  );
  const minimumVisibleY = Math.min(
    transformedHeight,
    extent.height * minimumVisibleRatio
  );

  return {
    x: clamp(
      view.x,
      minimumVisibleX - transformedWidth,
      extent.width - minimumVisibleX
    ),
    y: clamp(
      view.y,
      minimumVisibleY - transformedHeight,
      extent.height - minimumVisibleY
    ),
    scale
  };
}

export function zoomViewAt(
  view: PortSceneView,
  factor: number,
  anchor: PortScenePoint,
  extent: PortSceneExtent
): PortSceneView {
  const nextScale = clamp(
    view.scale * factor,
    PORT_SCENE_MIN_SCALE,
    PORT_SCENE_MAX_SCALE
  );
  const ratio = nextScale / view.scale;
  return clampView(
    {
      x: anchor.x - (anchor.x - view.x) * ratio,
      y: anchor.y - (anchor.y - view.y) * ratio,
      scale: nextScale
    },
    extent
  );
}

export function panView(
  view: PortSceneView,
  delta: PortScenePoint,
  extent: PortSceneExtent
): PortSceneView {
  return clampView(
    {
      ...view,
      x: view.x + delta.x,
      y: view.y + delta.y
    },
    extent
  );
}

export function focusBounds(
  bounds: PortSceneBounds,
  extent: PortSceneExtent
): PortSceneView {
  const boundsWidth = Math.max(1, bounds.maxX - bounds.minX);
  const boundsHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = clamp(
    Math.min(
      (extent.width * 0.42) / boundsWidth,
      (extent.height * 0.42) / boundsHeight,
      2.2
    ),
    PORT_SCENE_MIN_SCALE,
    PORT_SCENE_MAX_SCALE
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return clampView(
    {
      x: extent.width / 2 - centerX * scale,
      y: extent.height / 2 - centerY * scale,
      scale
    },
    extent
  );
}

export function ensureBoundsVisible(
  view: PortSceneView,
  bounds: PortSceneBounds,
  extent: PortSceneExtent,
  paddingRatio = 0.1
): PortSceneView {
  const paddingX = extent.width * paddingRatio;
  const paddingY = extent.height * paddingRatio;
  const projected = {
    minX: view.x + bounds.minX * view.scale,
    minY: view.y + bounds.minY * view.scale,
    maxX: view.x + bounds.maxX * view.scale,
    maxY: view.y + bounds.maxY * view.scale
  };
  let deltaX = 0;
  let deltaY = 0;
  if (projected.maxX - projected.minX > extent.width - paddingX * 2) {
    deltaX = extent.width / 2 - (projected.minX + projected.maxX) / 2;
  } else if (projected.minX < paddingX) {
    deltaX = paddingX - projected.minX;
  } else if (projected.maxX > extent.width - paddingX) {
    deltaX = extent.width - paddingX - projected.maxX;
  }
  if (projected.maxY - projected.minY > extent.height - paddingY * 2) {
    deltaY = extent.height / 2 - (projected.minY + projected.maxY) / 2;
  } else if (projected.minY < paddingY) {
    deltaY = paddingY - projected.minY;
  } else if (projected.maxY > extent.height - paddingY) {
    deltaY = extent.height - paddingY - projected.maxY;
  }
  if (deltaX === 0 && deltaY === 0) return view;
  return clampView(
    { ...view, x: view.x + deltaX, y: view.y + deltaY },
    extent
  );
}

export function pointerMovementIsClick(
  start: PortScenePoint,
  end: PortScenePoint,
  threshold = PORT_SCENE_CLICK_THRESHOLD
) {
  return Math.hypot(end.x - start.x, end.y - start.y) <= threshold;
}

export interface PortSceneMotionSample extends PortScenePoint {
  rotation: number;
}

export function sampleMotionPath(
  path: readonly PortScenePoint[],
  progress: number
): PortSceneMotionSample {
  if (path.length < 2) {
    const point = path[0] ?? { x: 0, y: 0 };
    return { ...point, rotation: 0 };
  }

  const segments = path.slice(1).map((point, index) => {
    const start = path[index] ?? point;
    return {
      start,
      end: point,
      length: Math.hypot(point.x - start.x, point.y - start.y)
    };
  });
  const totalLength = segments.reduce(
    (sum, segment) => sum + segment.length,
    0
  );
  const normalized = ((progress % 1) + 1) % 1;
  let remaining = normalized * totalLength;

  for (const segment of segments) {
    if (remaining <= segment.length || segment === segments.at(-1)) {
      const ratio = segment.length === 0 ? 0 : remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
        y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
        rotation:
          (Math.atan2(
            segment.end.y - segment.start.y,
            segment.end.x - segment.start.x
          ) *
            180) /
          Math.PI
      };
    }
    remaining -= segment.length;
  }

  const last = path.at(-1) ?? { x: 0, y: 0 };
  return { ...last, rotation: 0 };
}
