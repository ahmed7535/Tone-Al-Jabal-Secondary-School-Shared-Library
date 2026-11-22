'use client';
import { Loading } from '../ui';
import { AdminError } from './common';
import { useLoad } from '../useLoad';
import { sb } from '@/lib/supabase';

export function AdminStats() {
  const { data, error, reload } = useLoad(async () => {
    const r = await sb.rpc('admin_stats'); if (r.error) throw r.error; return r.data;
  }, []);
  if (error) return <AdminError error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const items = [['المستخدمون', data.users], ['الكتب', data.books], ['المسابقات', data.competitions], ['طلبات الكتب', data.requests], ['طلبات جديدة', data.new_requests], ['المشاركات', data.participants], ['إضافات للمفضلة', data.favorites], ['تسجيلات دخول (30 يومًا)', data.logins_30d], ['مشاهدات كتب (30 يومًا)', data.views_30d], ['تحميلات (30 يومًا)', data.downloads_30d]];
  const top = data.top_books || [];
  return (
    <>
      <div className="grid cols-auto">{items.map(([t, v]) => <div key={t} className="card stat"><b>{v}</b><span className="muted">{t}</span></div>)}</div>
      <div className="spacer" />
      <div className="card">
        <h3>أكثر الكتب مشاهدة</h3><div className="spacer" />
        {top.length ? <ol style={{ paddingInlineStart: 22 }}>{top.map((b, i) => <li key={i}>{b.title} <span className="muted">— {b.views_count}</span></li>)}</ol> : <p className="muted">لا توجد بيانات بعد.</p>}
      </div>
    </>
  );
}
