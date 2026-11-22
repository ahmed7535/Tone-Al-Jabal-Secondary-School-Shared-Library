'use client';
import { useState } from 'react';
import Icon from '../Icon';
import Modal from '../Modal';
import { Busy, Loading } from '../ui';
import { AdminError } from './common';
import { useApp, useAction } from '../AppProvider';
import { useLoad } from '../useLoad';
import { sb } from '@/lib/supabase';
import { UErr, compState, fmtDT, fmtDate, fullName, toLocalInput } from '@/lib/utils';

function CompForm({ comp: c, onClose, onSaved }) {
  const { profile, toast } = useApp();
  const [busy, run] = useAction();
  c = c || {};
  const submit = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const v = k => String(fd.get(k) || '').trim();
      if (v('title').length < 3 || !v('description')) throw new UErr('أكمل العنوان والوصف.');
      if (!v('starts') || !v('ends')) throw new UErr('حدّد تاريخ البداية والنهاية.');
      const s = new Date(v('starts')), en = new Date(v('ends'));
      if (!(en > s)) throw new UErr('تاريخ النهاية يجب أن يكون بعد البداية.');
      const payload = { title: v('title'), description: v('description'), conditions: v('conditions') || null, starts_at: s.toISOString(), ends_at: en.toISOString(), is_published: fd.get('pub') === 'on' };
      const r = c.id ? await sb.from('competitions').update(payload).eq('id', c.id) : await sb.from('competitions').insert({ ...payload, created_by: profile.id });
      if (r.error) throw r.error;
      toast('تم حفظ المسابقة.', 'success'); onSaved();
    });
  };
  return (
    <Modal title={c.id ? 'تعديل مسابقة' : 'إنشاء مسابقة'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="cf1">عنوان المسابقة</label><input id="cf1" name="title" type="text" maxLength={200} defaultValue={c.title || ''} required /></div>
        <div className="field"><label htmlFor="cf2">وصف المسابقة</label><textarea id="cf2" name="description" maxLength={4000} style={{ minHeight: 110 }} defaultValue={c.description || ''} required /></div>
        <div className="field"><label htmlFor="cf3">شروط المشاركة</label><textarea id="cf3" name="conditions" maxLength={3000} style={{ minHeight: 90 }} defaultValue={c.conditions || ''} /></div>
        <div className="field"><label htmlFor="cf4">تاريخ البداية</label><input id="cf4" name="starts" type="datetime-local" defaultValue={c.starts_at ? toLocalInput(c.starts_at) : ''} required /></div>
        <div className="field"><label htmlFor="cf5">تاريخ النهاية</label><input id="cf5" name="ends" type="datetime-local" defaultValue={c.ends_at ? toLocalInput(c.ends_at) : ''} required /></div>
        <label className="check"><input type="checkbox" name="pub" defaultChecked={c.is_published !== false} /> منشورة للطلاب</label>
        <div className="spacer" />
        <button className="btn" type="submit" disabled={busy}><Busy busy={busy}><Icon n="check" /> حفظ المسابقة</Busy></button>
      </form>
    </Modal>
  );
}

function Participants({ comp, onClose }) {
  const { data, error } = useLoad(async () => {
    const r = await sb.from('competition_participants').select('created_at,answer,profiles(username,first_name,second_name,third_name)').eq('competition_id', comp.id).order('created_at');
    if (r.error) throw r.error; return r.data || [];
  }, [comp.id]);
  return (
    <Modal title={'المشاركون في: ' + comp.title} onClose={onClose}>
      {error ? <AdminError error={error} /> : !data ? <Loading /> : data.length ? (
        <div className="table-wrap"><table style={{ minWidth: 420 }}>
          <thead><tr><th>الطالب</th><th>الإجابة</th><th>الوقت</th></tr></thead>
          <tbody>{data.map((x, i) => (
            <tr key={i}>
              <td>{fullName(x.profiles)}<div className="muted" style={{ fontSize: '.78rem', direction: 'ltr', textAlign: 'right' }}>{x.profiles?.username}</div></td>
              <td>{x.answer || '—'}</td><td>{fmtDT(x.created_at)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <p className="muted">لا توجد مشاركات بعد.</p>}
    </Modal>
  );
}

export function AdminComps() {
  const { toast, confirmDialog } = useApp();
  const [form, setForm] = useState(null);
  const [parts, setParts] = useState(null);
  const [busy, run] = useAction();
  const { data, error, reload } = useLoad(async () => {
    const r = await sb.from('competitions').select('*').order('starts_at', { ascending: false });
    if (r.error) throw r.error; return r.data || [];
  }, []);
  if (error) return <AdminError error={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const del = c => run(async () => {
    if (!await confirmDialog(`حذف المسابقة "${c.title}" وكل مشاركاتها؟`)) return;
    const r = await sb.from('competitions').delete().eq('id', c.id); if (r.error) throw r.error;
    toast('تم حذف المسابقة.', 'success'); reload();
  });

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" type="button" onClick={() => setForm({ comp: null })}><Icon n="plus" /> إنشاء مسابقة</button>
      </div>
      {data.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>المسابقة</th><th>الفترة</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>{data.map(c => {
            const [t, k] = compState(c);
            return (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td style={{ fontSize: '.85rem' }}>{fmtDate(c.starts_at)} ← {fmtDate(c.ends_at)}</td>
                <td><span className={'badge ' + k}>{t}</span> {!c.is_published && <span className="badge bad">مخفية</span>}</td>
                <td><div className="row">
                  <button className="btn sm ghost" type="button" onClick={() => setParts(c)}><Icon n="users" s={15} /> المشاركون</button>
                  <button className="btn sm ghost" type="button" onClick={() => setForm({ comp: c })}><Icon n="edit" s={15} /></button>
                  <button className="btn sm danger" type="button" disabled={busy} onClick={() => del(c)}><Icon n="trash" s={15} /></button>
                </div></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      ) : <div className="card empty">لا توجد مسابقات بعد.</div>}
      {form && <CompForm comp={form.comp} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {parts && <Participants comp={parts} onClose={() => setParts(null)} />}
    </>
  );
}
