import { useEffect, useState } from "react";

function buildMediaQuery(maxWidth) {
  return `(max-width: ${Math.max(0, Number(maxWidth || 640))}px)`;
}

function getMatch(query) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(query).matches;
}

export default function useCompactLayout(maxWidth = 640) {
  const query = buildMediaQuery(maxWidth);
  const [isCompact, setIsCompact] = useState(() => getMatch(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const update = () => setIsCompact(mediaQuery.matches);
    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [query]);

  return isCompact;
}
