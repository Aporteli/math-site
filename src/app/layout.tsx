import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Inter, JetBrains_Mono, Noto_Sans_Georgian } from 'next/font/google';


const notoGeorgian = Noto_Sans_Georgian({
  subsets: ['latin', 'georgian'],
  weight: ['400', '500', '600', '700', '900'],
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
    <html data-scroll-behavior="smooth" suppressHydrationWarning className={`${notoGeorgian.variable} ...`}>
      <body className="flex min-h-screen flex-col bg-paper text-ink">
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