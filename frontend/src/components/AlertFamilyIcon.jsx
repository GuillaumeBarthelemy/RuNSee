import { memo } from "react";

function AlertFamilyIcon({
  family = "",
  size = 18,
}) {
  const commonProps = {
    className: `alert-family-icon alert-family-icon-${family}`,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
  };

  if (family === "surcharge") {
    return (
      <svg {...commonProps}>
        <path d="M13.5 3.5c1.1 3.4-.8 4.8-2 6.4-.8 1-.8 2.2.2 3.1 1.5-1.1 2.4-2.8 2.5-4.6 2.4 1.8 3.8 4 3.8 6.4a6 6 0 0 1-12 0c0-2.9 2.1-5.1 4.2-7.3 1.1-1.2 2.2-2.4 3.3-4Z" />
      </svg>
    );
  }

  if (family === "structure") {
    return (
      <svg {...commonProps}>
        <path d="M5 19V9m7 10V5m7 14v-7" />
        <path d="M3.5 19.5h17" />
      </svg>
    );
  }

  if (family === "volume") {
    return (
      <svg {...commonProps}>
        <path d="M6 21c1.1-4.5 1.5-8.2.9-11.4M18 21c-1.1-4.5-1.5-8.2-.9-11.4" />
        <path d="M8.2 7.2c1-2 2.3-3.2 3.8-3.2s2.8 1.2 3.8 3.2" />
        <path d="M12 11.5v1.8M12 16.2v2" />
      </svg>
    );
  }

  if (family === "progression") {
    return (
      <svg {...commonProps}>
        <path d="M5 17.5 16.5 6" />
        <path d="M10.5 6h6v6" />
        <path d="M5 7.5v10h10" />
      </svg>
    );
  }

  if (family === "data") {
    return (
      <svg {...commonProps}>
        <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
        <path d="M12 3.5v2.1M12 18.4v2.1M4.6 7.1l1.8 1M17.6 15.9l1.8 1M4.6 16.9l1.8-1M17.6 8.1l1.8-1M3.5 12h2.1M18.4 12h2.1" />
      </svg>
    );
  }

  return null;
}

export default memo(AlertFamilyIcon);
