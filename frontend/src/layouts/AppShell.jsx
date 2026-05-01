export default function AppShell({ eyebrow, title, subtitle, actions = null, children }) {
  return (
    <>
      <header className="app-header">
        <div className="app-header-copy">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="app-header-actions">{actions}</div> : null}
      </header>

      <div className="app-sections">{children}</div>
    </>
  );
}
