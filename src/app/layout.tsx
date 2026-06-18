import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "건담 챗봇 - 건담 전문 AI 어시스턴트",
  description: "건담 시리즈의 모든 것을 알고 있는 AI 챗봇입니다. 기체, 파일럿, 세계관에 대해 물어보세요!",
  keywords: ["건담", "Gundam", "챗봇", "기동전사", "건프라"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKR.variable} font-sans bg-gray-950 text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
