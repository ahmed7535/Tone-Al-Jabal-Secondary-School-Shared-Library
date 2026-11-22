'use client';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { Busy, Gate, Page, PageHead } from '@/components/ui';
import { useApp, useAction } from '@/components/AppProvider';
import { sb } from '@/lib/supabase';
import { NAME_RE, UErr, fmtDate } from '@/lib/utils';

export default function ProfilePage() {
  const { ready, profile: p, refreshProfile, toast } = useApp();
  const [busy, run] = useAction();
  if (!ready) return null;
  if (!p) return <Gate />;

  const submit = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const v = ['first', 'second', 'third'].map(k => String(fd.get(k)).trim());
      if (!v.every(n => NAME_RE.test(n))) throw new UErr('اكتب الأسماء بحروف فقط (2 إلى 30 حرفًا).');
      const r = await sb.from('profiles').update({ first_name: v[0], second_name: v[1], third_name: v[2] }).eq('id', p.id);
      if (r.error) throw r.error;
      await refreshProfile(); toast('تم حفظ التعديلات.', 'success');
    });
  };

  return (
    <Page>
      <PageHead title="الملف الشخصي" crumb={<><Link href="/dashboard">لوحة الحساب</Link> ‹ الملف الشخصي</>} />
      <div className="card" style={{ maxWidth: 560 }}>
        <p className="muted">اسم المستخدم</p>
        <div className="big-user" style={{ fontSize: '1.2rem' }}>{p.username}</div>
        <p style={{ marginTop: 8 }}>
          {p.role === 'admin' ? <span className="badge ok">مسؤول</span> : <span className="badge info">طالب</span>}{' '}
          <span className="muted">منذ {fmtDate(p.created_at)}</span>
        </p>
        <div className="spacer" />
        <form onSubmit={submit} key={p.first_name + p.second_name + p.third_name}>
          <div className="field"><label htmlFor="pf1">اسم أول</label><input id="pf1" name="first" type="text" maxLength={30} defaultValue={p.first_name || ''} required /></div>
          <div className="field"><label htmlFor="pf2">اسم ثاني</label><input id="pf2" name="second" type="text" maxLength={30} defaultValue={p.second_name || ''} required /></div>
          <div className="field"><label htmlFor="pf3">الاسم الثالث</label><input id="pf3" name="third" type="text" maxLength={30} defaultValue={p.third_name || ''} required /></div>
          <button className="btn" type="submit" disabled={busy}><Busy busy={busy}><Icon n="check" /> حفظ</Busy></button>
        </form>
      </div>
    </Page>
  );
}
