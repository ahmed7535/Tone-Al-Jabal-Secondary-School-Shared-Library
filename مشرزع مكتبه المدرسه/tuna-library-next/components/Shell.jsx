'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon from './Icon';
import { Loading, Page } from './ui';
import { useApp, useAction } from './AppProvider';
import { IS_CONFIGURED } from '@/lib/supabase';
import { PwForm } from './PwForm';

export default function Shell({ children }) {
  const { settings, theme, setPref, ready, profile } = useApp();
  const path = usePathname() || '/';
  const isAccountArea = ['/account', '/dashboard', '/admin', '/profile', '/settings'].some(p => path === p || path.startsWith(p + '/'));
  const year = new Date().getFullYear();

  let body = children;
  if (!IS_CONFIGURED) body = <SetupNotice />;
  else if (!ready) body = <Loading />;
  else if (profile?.must_change_password && path !== '/account') body = <ForceChange />;

  return (
    <>
      <header className="topbar">
        <div className="container">
          <Link className="brand" href="/" aria-label="الرئيسية">
            <div className="logo"><Icon n="book" s={24} /></div>
            <span>{settings.site_name || 'المكتبة'}</span>
          </Link>
          <nav className="nav" aria-label="القائمة الرئيسية">
            <Link href="/" className={!isAccountArea ? 'active' : ''}><Icon n="home" /><span>الرئيسية</span></Link>
            <Link href="/account" className={isAccountArea ? 'active' : ''}><Icon n="user" /><span>حسابك</span></Link>
          </nav>
          <button className="icon-btn" type="button" aria-label="تبديل الوضع الليلي والنهاري"
            onClick={() => setPref(theme === 'dark' ? 'light' : 'dark')}>
            <Icon n={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>
      <main className="container" id="view" aria-live="polite">{body}</main>
      <footer className="site-foot">
        <div className="foot-in">
          <img src="/school-logo.jpg" alt="" width="46" height="46" />
          <div className="foot-txt"><strong>مكتبة مدرسة تونا الجبل الثانوية المشتركة</strong><span>معًا .. نحو تعليم أفضل</span></div>
          <small>© {year} جميع الحقوق محفوظة</small>
        </div>
      </footer>
    </>
  );
}

function SetupNotice() {
  return (
    <div className="card page" style={{ maxWidth: 720, margin: '30px auto' }}>
      <h2><Icon n="settings" /> المنصة تحتاج إلى ربط Supabase</h2>
      <p style={{ margin: '10px 0' }}>
        لم يُضبط الاتصال بقاعدة البيانات بعد. انسخ <code>.env.example</code> إلى <code>.env.local</code> وضع قيمتَي{' '}
        <b>NEXT_PUBLIC_SUPABASE_URL</b> و<b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b>، ثم أعد تشغيل الخادم، ونفّذ{' '}
        <code>supabase/supabase.sql</code> كما في <code>README.md</code>.
      </p>
    </div>
  );
}

function ForceChange() {
  const { signOut } = useApp();
  const router = useRouter();
  const [busyOut, runOut] = useAction();
  return (
    <Page>
      <div className="card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <h2><Icon n="shield" /> تغيير كلمة المرور إلزامي</h2>
        <p className="muted" style={{ margin: '8px 0 16px' }}>هذا حساب إدارة بكلمة مرور أولية. يجب تعيين كلمة مرور جديدة قبل المتابعة.</p>
        <PwForm onDone={() => router.push('/dashboard')} />
        <div className="spacer" />
        <button className="btn ghost" type="button" disabled={busyOut} onClick={() => runOut(signOut)}><Icon n="logout" /> خروج</button>
      </div>
    </Page>
  );
}
