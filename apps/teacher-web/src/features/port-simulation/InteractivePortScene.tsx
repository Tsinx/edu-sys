import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent
} from "react";
import {
  PORT_SCENE_CLICK_THRESHOLD,
  PORT_SCENE_ZOOM_FACTOR,
  createFitView,
  ensureBoundsVisible,
  focusBounds,
  panView,
  pointerMovementIsClick,
  sampleMotionPath,
  zoomViewAt,
  type PortSceneView
} from "./port-scene-camera";
import {
  getEntityBounds,
  getGeometryBounds,
  type PortSceneDefinition,
  type PortSceneEntity,
  type PortSceneEntityHighlight,
  type PortSceneGeometry,
  type PortSceneEntityProjection,
  type PortScenePoint,
  type PortScenePrimitiveGeometry
} from "./port-scene-types";

export interface InteractivePortSceneProps {
  scene: PortSceneDefinition;
  selectedEntityId?: string | null;
  defaultSelectedEntityId?: string;
  animationPaused?: boolean;
  entityProjections?: readonly PortSceneEntityProjection[];
  entityHighlights?: readonly PortSceneEntityHighlight[];
  ariaLabel: string;
  onEntitySelect?: (entity: PortSceneEntity | null) => void;
}

export interface InteractivePortSceneHandle {
  zoomIn(): void;
  zoomOut(): void;
  fitScene(): void;
  focusEntity(entityId: string): void;
  ensureEntityVisible(
    entityId: string,
    options?: { paddingRatio?: number }
  ): void;
}

interface ClientPoint {
  x: number;
  y: number;
}

interface SinglePointerGesture {
  pointerId: number;
  startClient: ClientPoint;
  startViewport: PortScenePoint;
  startView: PortSceneView;
  downEntityId: string | null;
  dragged: boolean;
}

interface PinchGesture {
  startDistance: number;
  startAnchor: PortScenePoint;
  startView: PortSceneView;
}

function pointsAttribute(points: readonly PortScenePoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function renderPrimitive(
  geometry: PortScenePrimitiveGeometry,
  key: string,
  tone?: string
): ReactNode {
  const common = {
    className: "port-scene__shape",
    "data-tone": tone ?? "base",
    vectorEffect: "non-scaling-stroke" as const
  };
  if (geometry.type === "rect") {
    return (
      <rect
        key={key}
        {...common}
        x={geometry.x}
        y={geometry.y}
        width={geometry.width}
        height={geometry.height}
        rx={geometry.rx}
      />
    );
  }
  if (geometry.type === "circle") {
    return (
      <circle
        key={key}
        {...common}
        cx={geometry.cx}
        cy={geometry.cy}
        r={geometry.r}
      />
    );
  }
  if (geometry.type === "polygon") {
    return (
      <polygon
        key={key}
        {...common}
        points={pointsAttribute(geometry.points)}
      />
    );
  }
  return (
    <polyline
      key={key}
      {...common}
      points={pointsAttribute(geometry.points)}
      fill="none"
    />
  );
}

function renderGeometry(geometry: PortSceneGeometry, entityId: string) {
  if (geometry.type !== "group") {
    return renderPrimitive(geometry, `${entityId}-shape`);
  }
  return geometry.parts.map((part, index) =>
    renderPrimitive(
      part.geometry,
      `${entityId}-part-${index}`,
      part.tone
    )
  );
}

function transformAt(
  point: PortScenePoint,
  rotation = 0
) {
  return `translate(${point.x} ${point.y}) rotate(${rotation})`;
}

function initialTransform(
  entity: PortSceneEntity,
  projection?: PortSceneEntityProjection
) {
  if (projection?.x !== undefined && projection.y !== undefined) {
    return transformAt(
      { x: projection.x, y: projection.y },
      projection.rotation ?? 0
    );
  }
  if (entity.motion?.path.length) {
    const sample = sampleMotionPath(
      entity.motion.path,
      entity.motion.phase ?? 0
    );
    return transformAt(
      sample,
      entity.motion.rotateToPath ? sample.rotation : 0
    );
  }
  const position = entity.position ?? { x: 0, y: 0, rotation: 0 };
  return transformAt(position, position.rotation ?? 0);
}

function appearanceClassNames(appearance: string) {
  return appearance
    .split(/\s+/u)
    .filter(Boolean)
    .map((name) => `port-scene__entity--${name}`)
    .join(" ");
}

function distance(left: ClientPoint, right: ClientPoint) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function midpoint(left: ClientPoint, right: ClientPoint): ClientPoint {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2
  };
}

export const InteractivePortScene = forwardRef<
  InteractivePortSceneHandle,
  InteractivePortSceneProps
>(function InteractivePortScene(
  {
    scene,
    selectedEntityId,
    defaultSelectedEntityId,
    animationPaused = false,
    entityProjections = [],
    entityHighlights = [],
    ariaLabel,
    onEntitySelect
  },
  forwardedRef
) {
  const extent = useMemo(
    () => ({ width: scene.width, height: scene.height }),
    [scene.height, scene.width]
  );
  const fitView = useMemo(() => createFitView(extent), [extent]);
  const [view, setView] = useState<PortSceneView>(fitView);
  const viewRef = useRef(view);
  const [internalSelectedEntityId, setInternalSelectedEntityId] =
    useState<string | null>(defaultSelectedEntityId ?? null);
  const [dragging, setDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [sceneVisible, setSceneVisible] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRootRef = useRef<HTMLDivElement>(null);
  const motionNodesRef = useRef(new Map<string, SVGGElement>());
  const pointersRef = useRef(new Map<number, ClientPoint>());
  const singleGestureRef = useRef<SinglePointerGesture | null>(null);
  const pinchGestureRef = useRef<PinchGesture | null>(null);
  const animationElapsedRef = useRef(0);
  const resolvedSelectedEntityId =
    selectedEntityId === undefined
      ? internalSelectedEntityId
      : selectedEntityId;
  const projectionByEntityId = useMemo(
    () => new Map(entityProjections.map((item) => [item.entityId, item])),
    [entityProjections]
  );
  const highlightByEntityId = useMemo(
    () => new Map(entityHighlights.map((item) => [item.entityId, item.kind])),
    [entityHighlights]
  );

  const sortedEntities = useMemo(() => {
    const layerOrders = new Map(
      scene.layers
        .filter((layer) => layer.visible !== false)
        .map((layer) => [layer.id, layer.order])
    );
    return [...scene.entities]
      .filter((entity) => layerOrders.has(entity.layerId))
      .sort(
        (left, right) =>
          (layerOrders.get(left.layerId) ?? 0) -
          (layerOrders.get(right.layerId) ?? 0)
      );
  }, [scene.entities, scene.layers]);

  const motionEntities = useMemo(
    () =>
      sortedEntities.filter(
        (entity) => entity.motion && !projectionByEntityId.has(entity.id)
      ),
    [projectionByEntityId, sortedEntities]
  );

  const updateView = useCallback(
    (next: PortSceneView | ((current: PortSceneView) => PortSceneView)) => {
      setView((current) => {
        const resolved =
          typeof next === "function" ? next(current) : next;
        viewRef.current = resolved;
        return resolved;
      });
    },
    []
  );

  const chooseEntity = useCallback(
    (entityId: string | null) => {
      const entity = entityId
        ? scene.entities.find((item) => item.id === entityId) ?? null
        : null;
      if (selectedEntityId === undefined) {
        setInternalSelectedEntityId(entity?.id ?? null);
      }
      onEntitySelect?.(entity);
    },
    [onEntitySelect, scene.entities, selectedEntityId]
  );

  const zoomAtCentre = useCallback(
    (factor: number) => {
      updateView((current) =>
        zoomViewAt(
          current,
          factor,
          { x: scene.width / 2, y: scene.height / 2 },
          extent
        )
      );
    },
    [extent, scene.height, scene.width, updateView]
  );

  const fitScene = useCallback(() => {
    updateView(fitView);
  }, [fitView, updateView]);

  const resolveEntityBounds = useCallback(
    (entity: PortSceneEntity) => {
      const geometryBounds = getGeometryBounds(entity.geometry);
      const projection = projectionByEntityId.get(entity.id);
      const position =
        projection?.x !== undefined && projection.y !== undefined
          ? { x: projection.x, y: projection.y }
          : entity.motion?.path[0] ?? entity.position ?? { x: 0, y: 0 };
      return {
        minX: geometryBounds.minX + position.x,
        minY: geometryBounds.minY + position.y,
        maxX: geometryBounds.maxX + position.x,
        maxY: geometryBounds.maxY + position.y
      };
    },
    [projectionByEntityId]
  );

  useImperativeHandle(
    forwardedRef,
    () => ({
      zoomIn: () => zoomAtCentre(PORT_SCENE_ZOOM_FACTOR),
      zoomOut: () => zoomAtCentre(1 / PORT_SCENE_ZOOM_FACTOR),
      fitScene,
      focusEntity: (entityId: string) => {
        const entity = scene.entities.find((item) => item.id === entityId);
        if (!entity) return;
        updateView(focusBounds(resolveEntityBounds(entity), extent));
      },
      ensureEntityVisible: (entityId, options) => {
        const entity = scene.entities.find((item) => item.id === entityId);
        if (!entity) return;
        updateView((current) =>
          ensureBoundsVisible(
            current,
            resolveEntityBounds(entity),
            extent,
            options?.paddingRatio ?? 0.1
          )
        );
      }
    }),
    [
      extent,
      fitScene,
      resolveEntityBounds,
      scene.entities,
      updateView,
      zoomAtCentre
    ]
  );

  useEffect(() => {
    viewRef.current = fitView;
    setView(fitView);
    animationElapsedRef.current = 0;
    pointersRef.current.clear();
    singleGestureRef.current = null;
    pinchGestureRef.current = null;
  }, [fitView, scene.id]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const update = () => setDocumentVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const root = sceneRootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setSceneVisible(entry?.isIntersecting ?? true),
      { threshold: 0.05 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const animationCanPlay =
    !animationPaused && !reducedMotion && documentVisible && sceneVisible;

  useEffect(() => {
    if (!animationCanPlay || motionEntities.length === 0) return undefined;
    let frameId = 0;
    let lastTime = performance.now();
    const animate = (time: number) => {
      animationElapsedRef.current += Math.min(64, time - lastTime);
      lastTime = time;
      for (const entity of motionEntities) {
        const motion = entity.motion;
        const node = motionNodesRef.current.get(entity.id);
        if (!motion || !node) continue;
        const progress =
          animationElapsedRef.current / motion.durationMs +
          (motion.phase ?? 0);
        const sample = sampleMotionPath(motion.path, progress);
        node.setAttribute(
          "transform",
          transformAt(sample, motion.rotateToPath ? sample.rotation : 0)
        );
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [animationCanPlay, motionEntities]);

  const clientToViewport = useCallback((client: ClientPoint) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = client.x;
    point.y = client.y;
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const client = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, client);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointersRef.current.size === 1) {
      const target = event.target as Element;
      const entityId =
        target.closest<SVGGElement>("[data-scene-entity-id]")?.dataset
          .sceneEntityId ?? null;
      singleGestureRef.current = {
        pointerId: event.pointerId,
        startClient: client,
        startViewport: clientToViewport(client),
        startView: viewRef.current,
        downEntityId: entityId,
        dragged: false
      };
      pinchGestureRef.current = null;
      return;
    }

    const active = [...pointersRef.current.values()].slice(0, 2);
    const first = active[0];
    const second = active[1];
    if (!first || !second) return;
    pinchGestureRef.current = {
      startDistance: Math.max(1, distance(first, second)),
      startAnchor: clientToViewport(midpoint(first, second)),
      startView: viewRef.current
    };
    if (singleGestureRef.current) singleGestureRef.current.dragged = true;
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const client = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, client);

    if (pointersRef.current.size >= 2 && pinchGestureRef.current) {
      const active = [...pointersRef.current.values()].slice(0, 2);
      const first = active[0];
      const second = active[1];
      if (!first || !second) return;
      const pinch = pinchGestureRef.current;
      const currentAnchor = clientToViewport(midpoint(first, second));
      const factor = distance(first, second) / pinch.startDistance;
      const zoomed = zoomViewAt(
        pinch.startView,
        factor,
        pinch.startAnchor,
        extent
      );
      updateView(
        panView(
          zoomed,
          {
            x: currentAnchor.x - pinch.startAnchor.x,
            y: currentAnchor.y - pinch.startAnchor.y
          },
          extent
        )
      );
      setDragging(true);
      return;
    }

    const gesture = singleGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const moved = !pointerMovementIsClick(
      gesture.startClient,
      client,
      PORT_SCENE_CLICK_THRESHOLD
    );
    if (!moved && !gesture.dragged) return;
    gesture.dragged = true;
    const currentViewport = clientToViewport(client);
    updateView(
      panView(
        gesture.startView,
        {
          x: currentViewport.x - gesture.startViewport.x,
          y: currentViewport.y - gesture.startViewport.y
        },
        extent
      )
    );
    setDragging(true);
  };

  const finishPointer = (
    event: ReactPointerEvent<SVGSVGElement>,
    cancelled: boolean
  ) => {
    const client = { x: event.clientX, y: event.clientY };
    const gesture = singleGestureRef.current;
    const wasSinglePointer = pointersRef.current.size === 1;
    const shouldSelect =
      !cancelled &&
      wasSinglePointer &&
      gesture?.pointerId === event.pointerId &&
      !gesture.dragged &&
      pointerMovementIsClick(gesture.startClient, client);

    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (shouldSelect) chooseEntity(gesture.downEntityId);

    const remaining = [...pointersRef.current.entries()][0];
    if (remaining) {
      const [pointerId, point] = remaining;
      singleGestureRef.current = {
        pointerId,
        startClient: point,
        startViewport: clientToViewport(point),
        startView: viewRef.current,
        downEntityId: null,
        dragged: true
      };
    } else {
      singleGestureRef.current = null;
      setDragging(false);
    }
    pinchGestureRef.current = null;
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const anchor = clientToViewport({ x: event.clientX, y: event.clientY });
    const factor = Math.exp(-event.deltaY * 0.0014);
    updateView((current) => zoomViewAt(current, factor, anchor, extent));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    const stepX = scene.width * 0.045;
    const stepY = scene.height * 0.045;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomAtCentre(PORT_SCENE_ZOOM_FACTOR);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomAtCentre(1 / PORT_SCENE_ZOOM_FACTOR);
    } else if (event.key === "0") {
      event.preventDefault();
      fitScene();
    } else if (event.key === "Escape") {
      event.preventDefault();
      chooseEntity(null);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateView((current) => panView(current, { x: stepX, y: 0 }, extent));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      updateView((current) => panView(current, { x: -stepX, y: 0 }, extent));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      updateView((current) => panView(current, { x: 0, y: stepY }, extent));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      updateView((current) => panView(current, { x: 0, y: -stepY }, extent));
    }
  };

  const animationState = reducedMotion
    ? "reduced"
    : animationCanPlay
      ? "playing"
      : "paused";
  const selectedEntity = resolvedSelectedEntityId
    ? scene.entities.find((entity) => entity.id === resolvedSelectedEntityId) ?? null
    : null;

  return (
    <section
      ref={sceneRootRef}
      className="interactive-port-scene"
      data-scene-id={scene.id}
      data-scene-version={scene.version}
      data-animation-state={animationState}
      data-selected-entity={selectedEntity?.id ?? "none"}
      data-view-scale={view.scale.toFixed(3)}
      aria-label={ariaLabel}
    >
      <div className="interactive-port-scene__canvas-shell">
        <svg
          ref={svgRef}
          className={
            dragging
              ? "interactive-port-scene__canvas interactive-port-scene__canvas--dragging"
              : "interactive-port-scene__canvas"
          }
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          role="application"
          aria-label={`${scene.title}。拖动平移，滚轮或双指缩放，点击设施查看信息。`}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishPointer(event, false)}
          onPointerCancel={(event) => finishPointer(event, true)}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
        >
          <defs>
            <pattern
              id={`${scene.id}-minor-grid`}
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 30 0 L 0 0 0 30" className="port-scene__grid-minor" />
            </pattern>
            <pattern
              id={`${scene.id}-major-grid`}
              width="150"
              height="150"
              patternUnits="userSpaceOnUse"
            >
              <rect
                width="150"
                height="150"
                fill={`url(#${scene.id}-minor-grid)`}
              />
              <path d="M 150 0 L 0 0 0 150" className="port-scene__grid-major" />
            </pattern>
            <pattern
              id={`${scene.id}-water-lines`}
              width="72"
              height="38"
              patternUnits="userSpaceOnUse"
            >
              <path d="M 0 19 Q 18 6 36 19 T 72 19" className="port-scene__water-line" />
            </pattern>
          </defs>

          <g
            className="port-scene__camera"
            transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}
          >
            <rect
              x="0"
              y="0"
              width={scene.width}
              height={scene.height}
              className="port-scene__paper"
            />
            <rect
              x="0"
              y="0"
              width={scene.width}
              height={scene.height}
              fill={`url(#${scene.id}-major-grid)`}
              className="port-scene__grid"
            />
            {sortedEntities.map((entity) => {
              const projection = projectionByEntityId.get(entity.id);
              const selectable = entity.selectable !== false;
              const selected = entity.id === resolvedSelectedEntityId;
              const highlightKind = selected
                ? "selected"
                : highlightByEntityId.get(entity.id);
              const geometryBounds = getGeometryBounds(entity.geometry);
              const className = [
                "port-scene__entity",
                appearanceClassNames(entity.appearance),
                selectable ? "port-scene__entity--selectable" : "",
                selected ? "port-scene__entity--selected" : "",
                projection?.operationalState
                  ? `port-scene__entity--state-${projection.operationalState}`
                  : "",
                highlightKind
                  ? `port-scene__entity--highlight-${highlightKind}`
                  : ""
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <g
                  key={entity.id}
                  ref={
                    entity.motion && !projection
                      ? (node) => {
                          if (node) motionNodesRef.current.set(entity.id, node);
                          else motionNodesRef.current.delete(entity.id);
                        }
                      : undefined
                  }
                  transform={initialTransform(entity, projection)}
                  className={className}
                  data-scene-entity-id={selectable ? entity.id : undefined}
                  data-entity-category={entity.category}
                  role={selectable ? "button" : undefined}
                  aria-label={
                    selectable
                      ? projection?.statusLabel
                        ? `${entity.label}，${projection.statusLabel}`
                        : entity.label
                      : undefined
                  }
                  aria-pressed={selectable ? selected : undefined}
                  tabIndex={selectable ? 0 : undefined}
                  onKeyDown={
                    selectable
                      ? (event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          event.stopPropagation();
                          chooseEntity(entity.id);
                        }
                      : undefined
                  }
                >
                  {renderGeometry(entity.geometry, entity.id)}
                  {highlightKind ? (
                    <g
                      className="port-scene__highlight"
                      data-highlight-kind={highlightKind}
                      pointerEvents="none"
                    >
                      {highlightKind === "selected" ? (
                        <rect
                          x={geometryBounds.minX - 12}
                          y={geometryBounds.minY - 12}
                          width={geometryBounds.maxX - geometryBounds.minX + 24}
                          height={geometryBounds.maxY - geometryBounds.minY + 24}
                          rx="12"
                          className="port-scene__highlight-halo"
                          vectorEffect="non-scaling-stroke"
                        />
                      ) : null}
                      <rect
                        x={geometryBounds.minX - 8}
                        y={geometryBounds.minY - 8}
                        width={geometryBounds.maxX - geometryBounds.minX + 16}
                        height={geometryBounds.maxY - geometryBounds.minY + 16}
                        rx="9"
                        className="port-scene__highlight-outline"
                        vectorEffect="non-scaling-stroke"
                      />
                      {highlightKind === "selected" ? (
                        <text
                          x={(geometryBounds.minX + geometryBounds.maxX) / 2}
                          y={geometryBounds.minY - 20}
                          textAnchor="middle"
                          className="port-scene__highlight-label"
                        >
                          {entity.label}
                        </text>
                      ) : null}
                    </g>
                  ) : null}
                  {entity.showLabel && entity.labelPosition ? (
                    <text
                      x={entity.labelPosition.x}
                      y={entity.labelPosition.y}
                      textAnchor={entity.labelPosition.anchor ?? "start"}
                      className="port-scene__entity-label"
                    >
                      {entity.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <rect
              x="0"
              y="0"
              width={scene.width}
              height="310"
              fill={`url(#${scene.id}-water-lines)`}
              className="port-scene__water-texture"
              pointerEvents="none"
            />
          </g>
        </svg>
        <div className="interactive-port-scene__hint">
          拖动平移 · 滚轮或双指缩放 · 点击设施查看
        </div>
      </div>
      <footer className="interactive-port-scene__footer">
        <span>PORT SCENE · V1.0</span>
        <span>{scene.attribution}</span>
      </footer>
      <span className="interactive-port-scene__sr-only" aria-live="polite">
        {selectedEntity
          ? `已选择：${selectedEntity.label}。${
              projectionByEntityId.get(selectedEntity.id)?.statusLabel ??
              "位置已在港区总图标出"
            }`
          : "未选择设施"}
      </span>
    </section>
  );
});

export function portSceneEntityFitsDefinition(
  scene: PortSceneDefinition,
  entity: PortSceneEntity
) {
  const bounds = getEntityBounds(entity);
  return (
    bounds.minX >= 0 &&
    bounds.minY >= 0 &&
    bounds.maxX <= scene.width &&
    bounds.maxY <= scene.height
  );
}

export type {
  PortSceneDefinition,
  PortSceneDetail,
  PortSceneEntity,
  PortSceneEntityProjection,
  PortSceneEntityHighlight,
  PortSceneGeometry,
  PortSceneLayer,
  PortSceneMotion
} from "./port-scene-types";
