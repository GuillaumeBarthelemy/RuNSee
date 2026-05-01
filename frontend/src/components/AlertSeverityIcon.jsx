import { memo } from "react";

function AlertSeverityIcon({
  severity = "info",
  size = 20,
}) {
  const normalizedSeverity = ["danger", "warning", "info", "positive"].includes(severity)
    ? severity
    : "info";

  if (normalizedSeverity === "warning") {
    return (
      <svg
        className={`alert-severity-icon alert-severity-icon-${normalizedSeverity}`}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 3 22 20H2L12 3Z" fill="currentColor" />
        <path d="M12 8.2v6.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17.4" r="1.15" fill="#fff" />
      </svg>
    );
  }

  return (
    <svg
      className={`alert-severity-icon alert-severity-icon-${normalizedSeverity}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      {normalizedSeverity === "danger" ? (
        <>
          <path d="M12 6.8v7.2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="17.2" r="1.2" fill="#fff" />
        </>
      ) : null}
      {normalizedSeverity === "info" ? (
        <>
          <circle cx="12" cy="7.5" r="1.25" fill="#fff" />
          <path d="M12 11v6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : null}
      {normalizedSeverity === "positive" ? (
        <path
          d="m7.3 12.2 3.1 3.1 6.3-6.7"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

export default memo(AlertSeverityIcon);
