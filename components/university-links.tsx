import { BookOpen, UserRound, Laptop, ExternalLink } from "lucide-react";

export function UniversityLinks({ rail = false, expanded = true }: { rail?: boolean; expanded?: boolean }) {
  const links = [
    { label: "Moodle МГИМО", href: "https://lms3.mgimo.ru/my/courses.php", icon: BookOpen },
    { label: "Образовательная среда", href: "https://ed.mgimo.ru/", icon: Laptop },
    { label: "Личный кабинет МГИМО", href: "https://lks.mgimo.ru/", icon: UserRound },
  ];
  return <nav className={rail ? "university-rail" : "mobile-university-links"} aria-label="Системы МГИМО">
    {links.map(link => <a className="nav-item" key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
      aria-label={link.label + " (новая вкладка)"} title={expanded ? undefined : link.label}>
      <link.icon size={20} aria-hidden="true"/><span className={rail ? "sidebar-label" : undefined}>{link.label}</span>
      {expanded && <ExternalLink className="external-glyph" size={13} aria-hidden="true"/>}
    </a>)}
  </nav>;
}
