

import '@fontsource-variable/assistant/index.css';
import '@/styles/tokens.css';
import '@/styles/layout.css';
import '@/styles/components.css';
import '@/styles/screens.css';
import '@/styles/selects.css';
import { Footer } from '@/components/layout/Footer';
import { QueryProvider } from '@/providers/QueryProvider';
import { UiProvider } from '@/providers/UiProvider';

export const metadata = {
  title: { default: 'שירות בקליק · ניהול ובקרה', template: '%s · שירות בקליק' },
  description: 'מערכת ניהול ובקרה של שירות בקליק: קריאות, אישורים, תחומי שירות והרשאות.',
  robots: { index: false, follow: false },
  icons: {
    icon: { url: '/srvonclick_favicon.ico?v=2ecba7fc59', type: 'image/x-icon' },
    shortcut: '/srvonclick_favicon.ico?v=2ecba7fc59',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3D314A',
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <QueryProvider>
          <UiProvider>
            {/* every page (the login too) fills the window above the footer, which closes the page */}
            <div className="app-body">{children}</div>
            <Footer />
          </UiProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
