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
      };
    })
    .filter((item) => item.text);
}

export default function InfoTooltip({
  title = "Info",
  content = [],
  label = "Afficher l'aide",
}) {
  const items = normalizeContent(content);

  if (!items.length) {
    return null;
  }

  return (
    <span className="info-tooltip">
      <button type="button" className="info-tooltip-trigger" aria-label={label}>
        i
      </button>
      <span className="info-tooltip-content" role="tooltip">
        {title ? <strong className="info-tooltip-title">{title}</strong> : null}
        <span className="info-tooltip-list">
          {items.map((item, index) => (
            <span className="info-tooltip-item" key={`${title}-${index}`}>
              {item.label ? <span className="info-tooltip-label">{item.label}</span> : null}
              <span className="info-tooltip-line">{item.text}</span>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
