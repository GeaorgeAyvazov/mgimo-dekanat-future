import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Деканат — всё для учёбы",
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
