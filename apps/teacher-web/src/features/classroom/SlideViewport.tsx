import {
  type PropsWithChildren,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_LOGICAL_HEIGHT,
  SLIDE_LOGICAL_WIDTH
} from "@edu/contracts";

interface SlideViewportProps extends PropsWithChildren {
  label: string;
}

export function SlideViewport({ children, label }: SlideViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const bounds = container.getBoundingClientRect();
      const nextScale = Math.min(
        bounds.width / SLIDE_LOGICAL_WIDTH,
        bounds.height / SLIDE_LOGICAL_HEIGHT
      );
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="slide-letterbox"
      data-slide-aspect={SLIDE_ASPECT_RATIO}
      data-slide-logical-size={`${SLIDE_LOGICAL_WIDTH}x${SLIDE_LOGICAL_HEIGHT}`}
      data-slide-scale={scale.toFixed(4)}
      aria-label={label}
    >
      <div
        className="slide-logical-canvas"
        style={{
          width: SLIDE_LOGICAL_WIDTH,
          height: SLIDE_LOGICAL_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`
        }}
      >
        {children}
      </div>
    </div>
  );
}
