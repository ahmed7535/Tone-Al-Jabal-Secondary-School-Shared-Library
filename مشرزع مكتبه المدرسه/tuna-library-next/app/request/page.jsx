'use client';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { BadgeStatus, Busy, ErrorCard, Gate, Loading, Page, PageHead } from '@/components/ui';
import { useApp, useAction } from '@/components/AppProvider';
import { useLoad } from '@/components/useLoad';
import { sb } from '@/lib/supabase';
import { GRADES, UErr, fmtDate, fullName } from '@/lib/utils';

export default function RequestPage() {
  const { ready, profile, toast, logAct } = useApp();
  const [busy, run] = useAction();
  const { data, error, reload } = useLoad(async () => {
    if (!profile) return null;
    const r = await sb.from('book_requests').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
    if (r.error) throw r.error;
    return r.data || [];
  }, [profile?.id]);

  if (!ready) return null;
  if (!profile) return <Gate msg="سجّل الدخول لطلب كتاب" />;
  if (error) return <ErrorCard error={error} onRetry={reload} />;
  if (!data) return <Page><Loading /></Page>;

  const submit = e => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    run(async () => {
      const v = k => String(fd.get(k) || '').trim();
      if (v('title').length < 2 || v('subject').length < 2 || v('student_name').length < 2) throw new UErr('أكمل الحقول المطلوبة.');
      if (!v('grade')) throw new UErr('اختر الصف الدراسي.');
      const r = await sb.from('book_requests').insert({
        user_id: profile.id, student_name: v('student_name'), title: v('title'), subject: v('subject'), grade: v('grade'), details: v('details') || null
      });
      if (r.error) throw r.error;
      logAct('book_request');
      toast('تم إرسال طلبك بنجاح. يمكنك متابعة حالته هنا.', 'success');
      f.reset(); reload();
    });
  };

  return (
    <Page>
      <PageHead title="طلب كتاب" crumb={<><Link href="/">الرئيسية</Link> ‹ طلب كتاب</>} />
      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <form className="card" onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="rt">اسم الكتاب المطلوب</label><input id="rt" name="title" type="text" maxLength={200} required /></div>
          <div className="field"><label htmlFor="rs">المادة الدراسية</label><input id="rs" name="subject" type="text" maxLength={80} required /></div>
          <div className="field"><label htmlFor="rg">الصف الدراسي</label>
            <select id="rg" name="grade" required defaultValue=""><option value="">اختر…</option>{GRADES.map(g => <option key={g}>{g}</option>)}</select></div>
          <div className="field"><label htmlFor="rn">اسم الطالب</label><input id="rn" name="student_name" type="text" maxLength={120} defaultValue={fullName(profile)} required /></div>
          <div className="field"><label htmlFor="rd">تفاصيل إضافية (اختياري)</label><textarea id="rd" name="details" maxLength={2000} style={{ minHeight: 90 }} /></div>
          <button className="btn block" type="submit" disabled={busy}><Busy busy={busy}><Icon n="plus" /> إرسال الطلب</Busy></button>
        </form>
        <div className="card">
          <h3>طلباتي وحالتها</h3>
          <div className="spacer" />
          {data.length ? (
            <div className="table-wrap"><table style={{ minWidth: 480 }}>
              <thead><tr><th>الكتاب</th><th>الحالة</th><th>ملاحظة الإدارة</th><th>التاريخ</th></tr></thead>
              <tbody>{data.map(r => (
                <tr key={r.id}>
                  <td>{r.title}<div className="muted" style={{ fontSize: '.8rem' }}>{r.subject} · {r.grade}</div></td>
                  <td><BadgeStatus st={r.status} /></td><td>{r.admin_note || '—'}</td><td>{fmtDate(r.created_at)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="muted">لم ترسل أي طلب بعد.</p>}
        </div>
      </div>
    </Page>
  );
}
