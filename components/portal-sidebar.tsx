"use client";
import { useRef, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Pin,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type NavigationItem = { id: string; label: string; icon: LucideIcon };

export function PortalSidebar({
  items,
  current,
  activeRequests,
  logo,
  name,
  group,
  initials,
  home,
  navigate,
}: {
  items: NavigationItem[];
  current: string;
  activeRequests: number;
  logo: ReactNode;
  name: string;
  group: string;
  initials: string;
  home: string;
  navigate: (view: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const expanded = hovered || focused || pinned;
  return (
    <aside
      className="sidebar reveal-sidebar"
      data-expanded={expanded}
      data-pinned={pinned}
      aria-label="Боковое меню"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerDownCapture={() => setFocused(false)}
      onFocusCapture={(event) => {
        if (
          event.target !== toggle.current &&
          event.target.matches(":focus-visible")
        )
          setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setPinned(false);
          setHovered(false);
          setFocused(false);
          toggle.current?.focus();
          event.preventDefault();
        }
      }}
    >
      <button
        className="logo-button"
        onClick={() => navigate(home)}
        aria-label="На главную"
        title="Центр сервиса"
      >
        {logo}
      </button>
      <div className="campus">
        <Building2 size={20} aria-hidden="true" />
        <span className="sidebar-label">
          МГИМО<small>Центр сервиса студентов</small>
        </span>
        <span className="campus-tag sidebar-label">DEMO</span>
      </div>
      <nav id="primary-navigation" aria-label="Основная навигация">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${current === item.id ? "active" : ""}`}
            onClick={() => navigate(item.id)}
            aria-label={item.label}
            title={expanded ? undefined : item.label}
            aria-current={current === item.id ? "page" : undefined}
          >
            <item.icon size={22} aria-hidden="true" />
            <span className="sidebar-label">{item.label}</span>
            {item.id === "services" && activeRequests > 0 && (
              <b className="nav-count sidebar-label">{activeRequests}</b>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button
          ref={toggle}
          className="sidebar-toggle nav-item"
          aria-controls="primary-navigation"
          aria-expanded={expanded}
          aria-label={
            pinned
              ? "Свернуть меню"
              : expanded
                ? "Закрепить меню"
                : "Развернуть меню"
          }
          title={pinned ? "Свернуть меню" : "Закрепить меню"}
          onClick={() => {
            if (pinned) {
              setPinned(false);
              setHovered(false);
              setFocused(false);
            } else setPinned(true);
          }}
        >
          {pinned ? (
            <ChevronLeft size={22} />
          ) : expanded ? (
            <Pin size={22} />
          ) : (
            <ChevronRight size={22} />
          )}
          <span className="sidebar-label">
            {pinned ? "Свернуть меню" : "Закрепить меню"}
          </span>
        </button>
        <div className="sidebar-demo">
          <ShieldCheck size={20} />
          <span className="sidebar-label">Учебный прототип</span>
        </div>
        <button
          className="sidebar-profile"
          onClick={() => navigate("profile")}
          aria-label="Мой профиль"
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
