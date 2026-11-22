'use client';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { BadgeStatus, ErrorCard, Gate, Loading, Page, PageHead } from '@/components/ui';
import { useApp, useAction } from '@/components/AppProvider';
import { useLoad } from '@/components/useLoad';
import { sb } from '@/lib/supabase';
import { fmtDate, fullName } from '@/lib/utils';

export default function DashboardPage() {
  const { profile, ready, favs, isAdmin, signOut } = useApp();
  const [busy, run] = useAction();
  const { data, loading, error, reload } = useLoad(async () => {
    if (!profile) return null;
    const [reqs, parts] = await Promise.all([
      sb.from('book_requests').select('id,title,status,created_at').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
      sb.from('competition_participants').select('created_at,competitions(id,title)').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5)
    ]);
    return { reqs: reqs.data || [], parts: parts.data || [] };
  }, [profile?.id]);

  if (!ready) return null;
  if (!profile) return <Gate />;
  if (error) return <ErrorCard error={error} onRetry={reload} />;
  if (!data) return <Page><Loading /></Page>;
  const p = profile;

  return (
    <Page>
      <PageHead title="لوحة الحساب" crumb="مرحبًا بك" />
      <div className="grid cols-2">
        <div className="card profile-card">
          <div className="pc-top">
            <div className="avatar" aria-hidden="true">{String(p.first_name || p.username || '؟').trim().charAt(0)}</div>
            <div>
              <h2>{fullName(p) || 'مستخدم'}</h2>
              {isAdmin ? <span className="badge ok">مسؤول</span> : <span className="badge info">طالب</span>}
            </div>
          </div>
          <p className="muted pc-user">اسم المستخدم: <b style={{ direction: 'ltr', display: 'inline-block', overflowWrap: 'anywhere' }}>{p.username}</b></p>
          <div className="pc-stats">
            <div className="pc-stat"><b>{favs.size}</b><span>كتاب في المفضلة</span></div>
            <div className="pc-stat"><b>{data.parts.length}</b><span>مشاركة حديثة</span></div>
          </div>
          <div className="pc-actions">
            <Link className="btn" href="/books"><Icon n="book" /> الكتب</Link>
            <Link className="btn ghost" href="/profile"><Icon n="user" /> الملف الشخصي</Link>
            <Link className="btn ghost" href="/settings"><Icon n="settings" /> الإعدادات</Link>
            {isAdmin && <Link className="btn" style={{ background: 'var(--accent)', color: '#1b1500' }} href="/admin"><Icon n="shield" /> لوحة الإدارة</Link>}
            <button className="btn ghost" type="button" disabled={busy} onClick={() => run(signOut)}><Icon n="logout" /> خروج</button>
          </div>
        </div>
        <div className="card">
          <h3><Icon n="trophy" /> مشاركاتي في المسابقات</h3>
          {data.parts.length ? (
            <ul style={{ marginTop: 10, paddingInlineStart: 20 }}>
              {data.parts.map((r, i) => (
                <li key={i}><Link href={`/competitions/${r.competitions?.id}`}>{r.competitions?.title || '—'}</Link> <span className="muted">— {fmtDate(r.created_at)}</span></li>
              ))}
            </ul>
          ) : <p className="muted" style={{ marginTop: 10 }}>لم تشارك بعد.</p>}
        </div>
      </div>
      <div className="spacer" />
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3><Icon n="plus" /> آخر طلبات الكتب</h3>
          <Link className="btn sm" href="/request">طلب جديد</Link>
        </div>
        <div className="spacer" />
        {data.reqs.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th>الكتاب</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>{data.reqs.map(r => <tr key={r.id}><td>{r.title}</td><td><BadgeStatus st={r.status} /></td><td>{fmtDate(r.created_at)}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="muted">لا توجد طلبات.</p>}
      </div>
    </Page>
  );
}
