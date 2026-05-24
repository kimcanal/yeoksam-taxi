import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "역삼권 택시 운영 시뮬레이터",
    template: "%s",
  },
  description:
    "강남·역삼권 9개 행정동의 정적 지도 자산과 번들 시나리오 기반 택시 운영 디지털 트윈",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
