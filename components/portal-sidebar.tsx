"use client";
import { useState, type ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { UniversityLinks } from "./university-links";

type NavigationItem = { id: string; label: string; icon: LucideIcon };

export function PortalSidebar({
  items,
  current,
  logo,
  name,
  group,
  initials,
  home,
  navigate,
}: {
  items: NavigationItem[];
  current: string;
  logo: ReactNode;
  name: string;
  group: string;
  initials: string;
  home: string;
  navigate: (view: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const expanded = hovered || focused;
  return (
    <aside
      className="sidebar reveal-sidebar"
      data-expanded={expanded}
      aria-label="Боковое меню"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerDownCapture={() => setFocused(false)}
      onFocusCapture={(event) => {
        if (event.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setHovered(false);
          setFocused(false);
          event.preventDefault();
        }
      }}
    >
      <button
        className="logo-button"
        onClick={() => navigate(home)}
        aria-label="На главную"
        title="На главную"
      >
        {logo}
      </button>
      <nav id="primary-navigation" aria-label="Основная навигация">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${current === item.id ? "active" : ""}`}
            data-section-start={item.id === "today" || undefined}
            onClick={() => navigate(item.id)}
            aria-label={item.label}
            title={expanded ? undefined : item.label}
            aria-current={current === item.id ? "page" : undefined}
          >
            <item.icon size={22} aria-hidden="true" />
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
      {home === "schedule" && <UniversityLinks rail expanded={expanded}/>}
      <div className="sidebar-bottom">
        <button
          className="sidebar-profile"
          onClick={() => navigate("profile")}
          aria-label="Мой профиль"
          aria-current={current === "profile" ? "page" : undefined}
          title={expanded ? undefined : name}
        >
          <span className="avatar">{initials}</span>
          <span className="sidebar-label">
            <strong>{name}</strong>
            <small>{group}</small>
          </span>
          <ChevronRight className="sidebar-label" size={16} />
        </button>
      </div>
    </aside>
  );
}
