import type { Metadata } from "next";
import "./globals.css";
import "./service-center.css";
import "./sidebar.css";
import "./employees.css";
import "./campus-map.css";
import "./study-hub.css";
import "./room-availability.css";
import "./office.css";

export const metadata: Metadata = {
  title: "Студент — личный кабинет МГИМО",
  description:
    "Расписание, успеваемость и справки в одном месте. Учебный прототип.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
