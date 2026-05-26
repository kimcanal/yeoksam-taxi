import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "역삼권 택시 운영 시뮬레이터 | 3D Mobility Digital Twin",
    template: "%s | 역삼권 택시 시뮬레이터",
  },
  description:
    "강남·역삼권 9개 행정동의 정적 지도 자산과 번들 시나리오 기반 택시 운영 디지털 트윈. 3D 시뮬레이션 및 데이터 시각화를 제공합니다.",
  openGraph: {
    title: "역삼권 택시 운영 시뮬레이터",
    description: "강남·역삼권 3D 모빌리티 디지털 트윈 및 수요 예측 플랫폼",
    type: "website",
    locale: "ko_KR",
    siteName: "Yeoksam Taxi Digital Twin",
  },
  twitter: {
    card: "summary_large_image",
    title: "역삼권 택시 운영 시뮬레이터",
    description: "강남·역삼권 3D 모빌리티 디지털 트윈 및 수요 예측 플랫폼",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
