import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppProviders from '@/contexts/AppProviders';
import AppLayout from '@/layouts/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IngenioCRM | Relaciones que hacen crecer',
  description: 'CRM Inteligente y Gestión de Ventas - Ingenio Digital',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-mark.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('crm_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AppProviders>
          <AppLayout>
            {children}
          </AppLayout>
        </AppProviders>
      </body>
    </html>
  );
}
