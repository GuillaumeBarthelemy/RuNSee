import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MOBILE_TOOLTIP_BREAKPOINT = 720;
const TOOLTIP_VIEWPORT_PADDING = 16;
const TOOLTIP_GAP = 14;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeContent(content) {
  const rawItems = Array.isArray(content) ? content : [content];

  return rawItems
    .filter(Boolean)
    .map((item) => {
      if (typeof item === "string") {
        return { label: "", text: item };
      }

      return {
        label: item?.label || "",
        text: item?.text || "",
        glossaryKey: typeof item?.glossaryKey === "string" ? item.glossaryKey.trim() : "",
      };
    })
    .filter((item) => item.text);
}

export default function InfoTooltip({
  title = "Info",
  content = [],
  label = "Afficher l'aide",
  customContent = null,
  contentClassName = "",
  glossaryKey = "",
}) {
  const items = normalizeContent(content);
  const resolvedGlossaryKey = String(glossaryKey || "").trim()
    || items.find((item) => item.glossaryKey)?.glossaryKey
    || "";
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const closeTimerRef = useRef(null);
  const tooltipId = useId();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [layout, setLayout] = useState({
    mode: "sheet",
    placement: "below",
    top: 0,
    left: 0,
  });
  const canUseDocument = typeof document !== "undefined";

  useLayoutEffect(() => {
    if (!canUseDocument || !(isHovered || isPinned) || !triggerRef.current || !tooltipRef.current) {
      return undefined;
    }

    let frameId = null;
    let observer = null;

    const updateLayout = () => {
      if (!triggerRef.current || !tooltipRef.current || typeof window === "undefined") {
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (viewportWidth <= MOBILE_TOOLTIP_BREAKPOINT) {
        setLayout((current) => (
          current.mode === "sheet"
            ? current
            : { mode: "sheet", placement: "below", top: 0, left: 0 }
        ));
        return;
      }

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const tooltipWidth = Math.min(tooltipRect.width || 420, viewportWidth - (TOOLTIP_VIEWPORT_PADDING * 2));
      const tooltipHeight = Math.min(tooltipRect.height || 320, viewportHeight - (TOOLTIP_VIEWPORT_PADDING * 2));
      const centeredLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2);
      const left = Math.round(
        clamp(
          centeredLeft,
          TOOLTIP_VIEWPORT_PADDING,
          viewportWidth - tooltipWidth - TOOLTIP_VIEWPORT_PADDING,
        ),
      );
      const spaceBelow = viewportHeight - triggerRect.bottom - TOOLTIP_GAP - TOOLTIP_VIEWPORT_PADDING;
      const spaceAbove = triggerRect.top - TOOLTIP_GAP - TOOLTIP_VIEWPORT_PADDING;
      const shouldOpenAbove = spaceBelow < Math.min(tooltipHeight, 280) && spaceAbove > spaceBelow;
      const rawTop = shouldOpenAbove
        ? triggerRect.top - tooltipHeight - TOOLTIP_GAP
        : triggerRect.bottom + TOOLTIP_GAP;
      const top = Math.round(
        clamp(
          rawTop,
          TOOLTIP_VIEWPORT_PADDING,
          viewportHeight - tooltipHeight - TOOLTIP_VIEWPORT_PADDING,
        ),
      );
      const nextLayout = {
        mode: "anchored",
        placement: shouldOpenAbove ? "above" : "below",
        top,
        left,
      };

      setLayout((current) => (
        current.mode === nextLayout.mode
          && current.placement === nextLayout.placement
          && current.top === nextLayout.top
          && current.left === nextLayout.left
          ? current
          : nextLayout
      ));
    };

    const requestUpdate = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(updateLayout);
    };

    requestUpdate();
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("scroll", requestUpdate, true);

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(requestUpdate);
      observer.observe(triggerRef.current);
      observer.observe(tooltipRef.current);
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("scroll", requestUpdate, true);
      observer?.disconnect();
    };
  }, [canUseDocument, isHovered, isPinned]);

  useEffect(() => () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isPinned) {
      return undefined;
    }

    function handleDocumentPointerDown(event) {
      const target = event.target;

      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) {
        return;
      }

      setIsPinned(false);
      setIsHovered(false);
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }

      setIsPinned(false);
      setIsHovered(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPinned]);

  if (!items.length && !customContent) {
    return null;
  }

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openTooltip = () => {
    clearCloseTimer();
    setIsHovered(true);
  };

  const closeTooltip = () => {
    clearCloseTimer();
    if (isPinned) {
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 160);
  };

  const togglePinnedTooltip = () => {
    clearCloseTimer();
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    setIsHovered(nextPinned);
  };

  const openGlossaryDefinition = (event) => {
    event.preventDefault();

    if (!resolvedGlossaryKey || typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("runsee:open-glossary", {
        detail: { entryKey: resolvedGlossaryKey },
      }),
    );
    setIsPinned(false);
    setIsHovered(false);
  };

  const isOpen = isHovered || isPinned;
  const tooltipClassName = [
    "info-tooltip-content",
    contentClassName,
    isOpen ? "is-open" : "",
    layout.mode === "anchored" ? "is-anchored" : "is-sheet",
    layout.placement === "above" ? "is-above" : "is-below",
  ]
    .filter(Boolean)
    .join(" ");
  const tooltipStyle = layout.mode === "anchored"
    ? {
        top: `${layout.top}px`,
        left: `${layout.left}px`,
      }
    : undefined;

  const tooltipContent = (
    <span
      ref={tooltipRef}
      id={tooltipId}
      className={tooltipClassName}
      style={tooltipStyle}
      role="tooltip"
      aria-hidden={isOpen ? "false" : "true"}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
    >
      {title ? <strong className="info-tooltip-title">{title}</strong> : null}
      {customContent ? customContent : (
        <span className="info-tooltip-list">
          {items.map((item, index) => (
            <span className="info-tooltip-item" key={`${title}-${index}`}>
              {item.label ? <span className="info-tooltip-label">{item.label}</span> : null}
              <span className="info-tooltip-line">{item.text}</span>
            </span>
          ))}
        </span>
      )}
      {resolvedGlossaryKey ? (
        <button
          type="button"
          className="info-tooltip-glossary-link"
          onClick={openGlossaryDefinition}
        >
          Definition complete -&gt;
        </button>
      ) : null}
    </span>
  );

  return (
    <span className="info-tooltip">
      <button
        ref={triggerRef}
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={tooltipId}
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onFocus={openTooltip}
        onBlur={closeTooltip}
        onClick={togglePinnedTooltip}
      >
        i
      </button>
      {canUseDocument ? createPortal(tooltipContent, document.body) : null}
    </span>
  );
}
