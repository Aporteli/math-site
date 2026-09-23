import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Noto_Sans_Georgian } from 'next/font/google';

const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['latin', 'georgian'],
  weight: 'variable',
  display: 'swap',
  variable: '--font-georgian',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${notoGeorgian.variable} ${notoGeorgian.className}`}
    >
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}