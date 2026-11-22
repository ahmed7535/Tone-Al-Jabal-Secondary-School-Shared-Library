import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import Shell from '@/components/Shell';

export const metadata = {
  title: 'مكتبة مدرسة تونا الجبل الثانوية المشتركة',
  description: 'منصة مكتبة مدرسية: تصفّح الكتب، شارك في المسابقات، وقدّم طلبات الكتب.',
  icons: { icon: '/logo.jpg' }
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b1730' };

// يمنع وميض السمة قبل تحميل React
const themeScript = `try{var p=localStorage.getItem('theme')||'auto';var t=p==='auto'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Amiri:wght@400;700&family=Noto+Kufi+Arabic:wght@600;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
