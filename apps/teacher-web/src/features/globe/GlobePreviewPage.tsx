import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Compass,
  MapPin,
  MousePointer2,
  Orbit
} from "lucide-react";
import {
  InteractiveEarthGlobe,
  type GlobeLocation,
  type GlobeRouteView,
  type GlobeShippingLaneDetail,
  type GlobeShippingLanePath,
  type GlobeShippingLaneState,
  type InteractiveEarthGlobeHandle
} from "./InteractiveEarthGlobe";
import {
  FEATURED_ROUTE_FOCUS,
  GLOBAL_MARITIME_LOCATIONS,
  GLOBAL_ROUTE_FOCUS,
  loadGlobalShippingLanes
} from "./global-maritime-preset";
import {
  LL3_GLOBE_LOCATIONS,
  LL3_GLOBE_ROUTES
} from "./ll3-globe-preset";
import "./globe-preview.css";

const FEATURE_ITEMS = [
  {
    icon: MousePointer2,
    title: "自由观察",
    detail: "拖动、缩放并点击全球港口与通道"
  },
  {
    icon: Compass,
    title: "GIS 海路",
    detail: "分级航线逐段贴合球面与可通航水域"
  },
  {
    icon: Orbit,
    title: "独立图层",
    detail: "航线专题与自然、行政地图自由组合"
  }
] as const;

type PreviewLocation = GlobeLocation & {
  role: string;
  note: string;
};

function buildPreviewLocations(): readonly PreviewLocation[] {
  const featuredIds = new Set(
    LL3_GLOBE_LOCATIONS.map((location) => location.id)
  );
  const globalIds = new Set(
    GLOBAL_MARITIME_LOCATIONS.map((location) => location.id)
  );
  return [
    ...GLOBAL_MARITIME_LOCATIONS.map((location) => ({
      ...location,
      visibilityScope: featuredIds.has(location.id)
        ? ("all" as const)
        : ("global" as const)
    })),
    ...LL3_GLOBE_LOCATIONS.filter(
      (location) => !globalIds.has(location.id)
    )
  ];
}

const PREVIEW_LOCATIONS = buildPreviewLocations();

export function GlobePreviewPage() {
  const globeRef = useRef<InteractiveEarthGlobeHandle>(null);
  const [routeView, setRouteView] =
    useState<GlobeRouteView>("global");
  const [shippingLaneDetail, setShippingLaneDetail] =
    useState<GlobeShippingLaneDetail>("major");
  const [shippingLaneState, setShippingLaneState] =
    useState<GlobeShippingLaneState>("loading");
  const [shippingLanes, setShippingLanes] = useState<
    readonly GlobeShippingLanePath[]
  >([]);
  const [selectedLocationId, setSelectedLocationId] =
    useState<string>("shanghai");

  useEffect(() => {
    let cancelled = false;
    loadGlobalShippingLanes()
      .then((paths) => {
        if (cancelled) return;
        setShippingLanes(paths);
        setShippingLaneState("ready");
      })
      .catch(() => {
        if (!cancelled) setShippingLaneState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLocation = useMemo(
    () =>
      PREVIEW_LOCATIONS.find(
        (location) => location.id === selectedLocationId
      ) ?? PREVIEW_LOCATIONS[0],
    [selectedLocationId]
  );
  const quickLocations = useMemo(
    () =>
      PREVIEW_LOCATIONS.filter((location) => {
        const visibleInMode =
          location.visibilityScope === "all" ||
          location.visibilityScope === routeView;
        return visibleInMode && location.showLabel !== false;
      }),
    [routeView]
  );
  const isGlobal = routeView === "global";

  return (
    <main className="globe-preview">
      <div className="globe-preview__noise" aria-hidden="true" />
      <header className="globe-preview__topbar">
        <a href="/" aria-label="返回教学中枢">
          EDU SYS
          <span>COMPONENT LAB</span>
        </a>
        <div>
          <i />
          独立组件预览
        </div>
      </header>

      <section className="globe-preview__intro">
        <p>COURSE VISUALIZATION · 01</p>
        <h1>把全球航路，放回真实地球</h1>
        <span>
          分级海运 GIS 航线、LL3 港序专题、真实港口城市坐标与
          PRC 标准地图依据的行政边界，共同组成可独立接入课程的交互式地球仪。
        </span>
      </section>

      <section className="globe-preview__stage">
        <InteractiveEarthGlobe
          ref={globeRef}
          locations={PREVIEW_LOCATIONS}
          routes={LL3_GLOBE_ROUTES}
          shippingLanes={shippingLanes}
          shippingLaneState={shippingLaneState}
          routeView={routeView}
          shippingLaneDetail={shippingLaneDetail}
          activeLocationIds={[selectedLocationId]}
          initialFocus={GLOBAL_ROUTE_FOCUS}
          globalRouteFocus={GLOBAL_ROUTE_FOCUS}
          featuredRouteFocus={FEATURED_ROUTE_FOCUS}
          title={
            isGlobal ? "全球主要海运航线" : "LL3 亚欧航线"
          }
          eyebrow={
            isGlobal
              ? "GLOBAL NETWORK · 2012 / 2022"
              : "84 DAYS · ASIA—EUROPE"
          }
          interactionHint="拖动地球开始观察 · 滚轮或双指缩放"
          attribution="底图：NASA Blue Marble"
          shippingLaneAttribution="航线：P. Benden / CIA · v1.3.1 · AIS 外部参照"
          featuredRouteAttribution="LL3：OOCL 2023 港序 · Eurostat SeaRoute 5 km"
          ariaLabel="全球主要海运航线交互式三维地球仪"
          onLocationSelect={(location) =>
            setSelectedLocationId(location.id)
          }
          onRouteViewChange={(view) => {
            setRouteView(view);
            setSelectedLocationId("shanghai");
          }}
          onShippingLaneDetailChange={setShippingLaneDetail}
        />

        <aside className="globe-preview__location-card" aria-live="polite">
          <div>
            <MapPin aria-hidden="true" />
            <span>当前节点</span>
          </div>
          <strong>{selectedLocation?.name}</strong>
          <p>{selectedLocation?.role}</p>
          <small>{selectedLocation?.note}</small>
          <dl>
            <div>
              <dt>纬度</dt>
              <dd>{selectedLocation?.latitude.toFixed(2)}°</dd>
            </div>
            <div>
              <dt>经度</dt>
              <dd>{selectedLocation?.longitude.toFixed(2)}°</dd>
            </div>
          </dl>
        </aside>
      </section>

      <nav
        className="globe-preview__quick-nav"
        aria-label={
          isGlobal ? "快速定位全球核心节点" : "快速定位LL3节点"
        }
      >
        {quickLocations.map((location) => (
          <button
            key={location.id}
            type="button"
            className={
              location.id === selectedLocationId
                ? "globe-preview__quick-button globe-preview__quick-button--active"
                : "globe-preview__quick-button"
            }
            onClick={() => {
              setSelectedLocationId(location.id);
              globeRef.current?.focusLocation(location.id);
            }}
          >
            <span>{location.name}</span>
            <small>{location.role}</small>
          </button>
        ))}
      </nav>

      <section className="globe-preview__features" aria-label="组件能力">
        {FEATURE_ITEMS.map(({ icon: Icon, title, detail }, index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <Icon aria-hidden="true" />
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
