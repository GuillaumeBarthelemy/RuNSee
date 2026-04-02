export default function AdminSectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="admin-section-header">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="card-title">{title}</h2>
      {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
    </div>
  );
}
