import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "اشتراک هشدارهای آب و هوا",
  description: "اشتراک در هشدارهای روزانه آب و هوا برای شهر شما",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
