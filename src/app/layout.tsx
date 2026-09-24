import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/i18n/I18nProvider';

export const metadata: Metadata = {
  applicationName: 'FindDex',
  title: 'FindDex | Social Profile Archive',
  description: 'Save, organize, and quickly find the social media profiles you discover with FindDex.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('finddex-theme') || localStorage.getItem('modelvault-theme');
                  if (!localStorage.getItem('finddex-theme') && saved) localStorage.setItem('finddex-theme', saved);
                  const preference = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
                  const theme = preference === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : preference;
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-pink-500 selection:text-white transition-colors duration-200">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
