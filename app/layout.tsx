import type {Metadata} from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

/* Typography follows the NeoFun brand: Gmarket Sans Bold for display, Pretendard
   for body and UI. Both are declared in globals.css — Pretendard from CDN, Gmarket
   Sans via local() only (the font file is not redistributable; see globals.css).
   The previous Inter/Space Grotesk/Playfair stack belonged to the Button Lab
   editorial system, which this app must not inherit. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Content OS',
  description: '레퍼런스 하나를 증거가 붙은 발행 후보로 바꾸는 콘텐츠 운영 시스템.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko" className={jetbrainsMono.variable}>
      <body className="font-sans text-nf-ink bg-nf-paper flex h-screen overflow-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
