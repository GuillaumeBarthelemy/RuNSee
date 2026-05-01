import { useLayoutEffect, useMemo, useRef, useState } from "react";

function resolveWidth(node) {
  if (!node || typeof node.getBoundingClientRect !== "function") {
    return 0;
  }

  return Math.round(node.getBoundingClientRect().width || 0);
}

function getDensity(width) {
  if (width <= 0) return "compact";
  if (width <= 420) return "phone";
  if (width <= 720) return "compact";
  if (width <= 1080) return "tablet";
  return "desktop";
}

export default function useChartViewport() {
  const containerRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  useLayoutEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return undefined;
    }

    const updateWidth = () => {
      setChartWidth(resolveWidth(node));
    };

    updateWidth();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries?.[0];
        const nextWidth = Math.round(entry?.contentRect?.width || resolveWidth(node));
        setChartWidth(nextWidth);
      });

      observer.observe(node);
      return () => observer.disconnect();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    return undefined;
  }, []);

  const density = useMemo(() => getDensity(chartWidth), [chartWidth]);
  const axisTick = useMemo(() => ({
    fontSize: density === "phone" ? 10 : density === "compact" ? 11 : 12,
    fill: "#7B8CA3",
  }), [density]);

  return {
    containerRef,
    chartWidth,
    density,
    axisTick,
    isPhone: density === "phone",
    isCompact: density === "phone" || density === "compact",
    isTablet: density === "tablet",
    showLegend: chartWidth > 0 && chartWidth >= 860,
  };
}
