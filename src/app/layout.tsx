import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" suppressHydrationWarning>
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