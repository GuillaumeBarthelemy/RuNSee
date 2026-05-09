import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const noop = () => {};

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * UserMenu — Alpine Light (Lot 2-bis).
 *
 * Bloc utilisateur en bas de sidebar : avatar + prénom + chevron dropdown.
 * Le dropdown contient : Réglages, Glossaire, Déconnexion.
 *
 * Props :
 * - account : { displayName, identifier, avatarUrl, initials }
 * - onLogout : callback
 * - isLoggingOut : boolean
 */
export default function UserMenu({
  account = {},
  onLogout = noop,
  isLoggingOut = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const displayName = account.displayName || account.identifier || "Utilisateur";
  const initials = account.initials || getInitials(displayName);

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="alpine-user-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`alpine-user-menu-trigger ${isOpen ? "is-open" : ""}`.trim()}
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Menu utilisateur ${displayName}`}
      >
        <span className="alpine-user-menu-avatar" aria-hidden="true">
          {account.avatarUrl ? (
            <img src={account.avatarUrl} alt="" />
          ) : (
            <span>{initials}</span>
          )}
        </span>
        <span className="alpine-user-menu-name">{displayName}</span>
        <svg className="alpine-user-menu-chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M5 8 L10 13 L15 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
      {isOpen ? (
        <div className="alpine-user-menu-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className="alpine-user-menu-item"
            onClick={() => handleNavigate("/admin")}
          >
            Réglages
          </button>
          <button
            type="button"
            role="menuitem"
            className="alpine-user-menu-item"
            onClick={() => handleNavigate("/glossaire")}
          >
            Glossaire
          </button>
          <hr className="alpine-user-menu-sep" />
          <button
            type="button"
            role="menuitem"
            className="alpine-user-menu-item alpine-user-menu-item-danger"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
