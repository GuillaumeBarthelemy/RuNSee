import { Link } from "react-router-dom";

export default function AppBrand() {
  return (
    <Link className="app-brand" to="/" aria-label="RunNSee, retour à l'accueil">
      <img
        className="app-brand-logo app-brand-logo-full"
        src="/logo_horizontal.png"
        alt="Logo RunNSee"
        width="320"
        height="76"
        decoding="async"
      />
      <img
        className="app-brand-logo app-brand-logo-compact"
        src="/logo_mark.png"
        alt=""
        width="56"
        height="40"
        decoding="async"
        aria-hidden="true"
      />
    </Link>
  );
}
