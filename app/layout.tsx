import type { Metadata } from "next";
import "./globals.css";
import "./service-center.css";

export const metadata: Metadata = {
  title: "Студент — центр сервиса МГИМО",
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
