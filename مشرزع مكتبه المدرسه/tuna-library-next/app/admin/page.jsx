'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Gate, Page, PageHead } from '@/components/ui';
import { useApp } from '@/components/AppProvider';
import { AdminStats } from '@/components/admin/Stats';
import { AdminBooks } from '@/components/admin/Books';
import { AdminComps } from '@/components/admin/Comps';
import { AdminReqs } from '@/components/admin/Reqs';
import { AdminUsers } from '@/components/admin/Users';
import { AdminSettings } from '@/components/admin/Settings';

const TABS = [
  ['stats', 'الإحصائيات', AdminStats], ['books', 'الكتب', AdminBooks], ['comps', 'المسابقات', AdminComps],
  ['reqs', 'طلبات الكتب', AdminReqs], ['users', 'المستخدمون', AdminUsers], ['settings', 'إعدادات المنصة', AdminSettings]
];

export default function AdminPage() {
  const { ready, profile, isAdmin } = useApp();
  const [tab, setTab] = useState('stats');
  if (!ready) return null;
  if (!profile) return <Gate />;
  if (!isAdmin) {
    return <Page><div className="card empty"><h2>هذه الصفحة للإدارة فقط</h2><Link className="btn" href="/dashboard">لوحة الحساب</Link></div></Page>;
  }
  const Active = TABS.find(t => t[0] === tab)[2];
  return (
    <Page>
      <PageHead title="لوحة الإدارة" crumb={<><Link href="/dashboard">لوحة الحساب</Link> ‹ الإدارة</>} />
      <div className="tabs">
        {TABS.map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} type="button" onClick={() => setTab(k)}>{t}</button>)}
      </div>
      <div><Active key={tab} /></div>
    </Page>
  );
}
