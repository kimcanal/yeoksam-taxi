import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "강남·역삼 택시 디지털 트윈",
    template: "%s | 강남·역삼 택시 디지털 트윈",
  },
  description:
    "강남·역삼 9개 행정동의 실제 OSM 도로망을 모사한 택시 시뮬레이션 및 수요 시각화 3D 디지털 트윈 공간입니다.",
  openGraph: {
    title: "강남·역삼 택시 디지털 트윈",
    description: "강남·역삼 9개 행정동 OSM 도로망 기반 3D 택시 디지털 트윈",
    type: "website",
    locale: "ko_KR",
    siteName: "Yeoksam Taxi Digital Twin",
  },
  twitter: {
    card: "summary_large_image",
    title: "강남·역삼 택시 디지털 트윈",
    description: "강남·역삼 9개 행정동 OSM 도로망 기반 3D 택시 디지털 트윈",
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
