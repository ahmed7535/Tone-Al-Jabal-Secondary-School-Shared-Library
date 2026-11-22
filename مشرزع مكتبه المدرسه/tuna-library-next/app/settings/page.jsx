'use client';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { Gate, Page, PageHead } from '@/components/ui';
import { PwForm } from '@/components/PwForm';
import { useApp, useAction } from '@/components/AppProvider';

export default function SettingsPage() {
  const { ready, profile, themePref, setPref, signOut } = useApp();
  const [busy, run] = useAction();
  if (!ready) return null;
  if (!profile) return <Gate />;
  return (
    <Page>
      <PageHead title="الإعدادات" crumb={<><Link href="/dashboard">لوحة الحساب</Link> ‹ الإعدادات</>} />
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>المظهر</h3>
          <div className="spacer" />
          <div className="chips">
            {[['light', 'نهاري'], ['dark', 'ليلي'], ['auto', 'تلقائي']].map(([k, t]) => (
              <button key={k} className={'chip' + (themePref === k ? ' on' : '')} type="button" onClick={() => setPref(k)}>{t}</button>
            ))}
          </div>
          <div className="spacer" />
          <button className="btn danger" type="button" disabled={busy} onClick={() => run(signOut)}><Icon n="logout" /> تسجيل الخروج</button>
        </div>
        <div className="card"><h3>تغيير كلمة المرور</h3><div className="spacer" /><PwForm /></div>
      </div>
    </Page>
  );
}
