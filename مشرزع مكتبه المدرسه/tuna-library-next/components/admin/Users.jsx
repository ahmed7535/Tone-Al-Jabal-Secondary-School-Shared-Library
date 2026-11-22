'use client';
import { useState } from 'react';
import { Loading } from '../ui';
import { AdminError } from './common';
import { useApp, useAction } from '../AppProvider';
import { useLoad } from '../useLoad';
import { sb } from '@/lib/supabase';
import { fullName } from '@/lib/utils';

export function AdminUsers() {
  const { profile, toast, confirmDialog } = useApp();
  const [q, setQ] = useState('');
  const [busy, run] = useAction();
  const { data, error, reload } = useLoad(async () => {
    const r = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    if (r.error) throw r.error; return r.data || [];
  }, []);
  if (error) return <AdminError error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const rows = data.filter(u => !q || [u.username, u.first_name, u.second_name, u.third_name].join(' ').toLowerCase().includes(q.toLowerCase()));
  const act = (u, kind) => run(async () => {
    const patch = kind === 'active' ? { is_active: !u.is_active } : { role: u.role === 'admin' ? 'student' : 'admin' };
    if (!await confirmDialog(`تأكيد هذا الإجراء على المستخدم ${u.username}؟`)) return;
    const res = await sb.from('profiles').update(patch).eq('id', u.id); if (res.error) throw res.error;
    toast('تم التحديث.', 'success'); reload();
  });

  return (
    <>
      <div className="field"><input type="search" placeholder="بحث بالاسم أو اسم المستخدم…" value={q} onChange={e => setQ(e.target.value)} /></div>
      {rows.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>{rows.map(u => (
            <tr key={u.id}>
              <td>{fullName(u) || '—'}</td><td style={{ direction: 'ltr', textAlign: 'right' }}>{u.username}</td>
              <td>{u.role === 'admin' ? <span className="badge ok">مسؤول</span> : <span className="badge info">طالب</span>}</td>
              <td>{u.is_active ? <span className="badge ok">نشط</span> : <span className="badge bad">موقوف</span>}</td>
              <td>{u.id === profile.id ? <span className="muted">حسابك</span> : (
                <div className="row">
                  <button className="btn sm ghost" type="button" disabled={busy} onClick={() => act(u, 'active')}>{u.is_active ? 'إيقاف' : 'تفعيل'}</button>
                  <button className="btn sm ghost" type="button" disabled={busy} onClick={() => act(u, 'role')}>{u.role === 'admin' ? 'إلغاء الإدارة' : 'ترقية لمسؤول'}</button>
                </div>
              )}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <div className="card empty">لا نتائج.</div>}
      <p className="muted" style={{ fontSize: '.85rem', marginTop: 10 }}>لإعادة تعيين كلمة مرور طالب: Supabase → Authentication → Users → اختر المستخدم → Send password recovery / Reset password (راجع README).</p>
    </>
  );
}
