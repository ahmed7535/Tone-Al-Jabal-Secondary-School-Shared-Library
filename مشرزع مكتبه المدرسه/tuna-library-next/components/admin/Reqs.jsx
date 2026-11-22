'use client';
import { useState } from 'react';
import Icon from '../Icon';
import Modal from '../Modal';
import { BadgeStatus, Busy, Loading } from '../ui';
import { AdminError } from './common';
import { useApp, useAction } from '../AppProvider';
import { useLoad } from '../useLoad';
import { sb } from '@/lib/supabase';
import { REQ_STATUS, fmtDate } from '@/lib/utils';

function ReqModal({ r, onClose, onSaved }) {
  const { toast } = useApp();
  const [busy, run] = useAction();
  const submit = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const u = await sb.from('book_requests').update({ status: String(fd.get('status')), admin_note: String(fd.get('note') || '').trim() || null }).eq('id', r.id);
      if (u.error) throw u.error;
      toast('تم تحديث الطلب.', 'success'); onSaved();
    });
  };
  return (
    <Modal title="تحديث الطلب" onClose={onClose}>
      <p><b>{r.title}</b> — {r.student_name}</p>
      <div className="spacer" />
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="rst">الحالة</label>
          <select id="rst" name="status" defaultValue={r.status}>{Object.entries(REQ_STATUS).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}</select></div>
        <div className="field"><label htmlFor="rnote">ملاحظة تظهر للطالب</label>
          <textarea id="rnote" name="note" maxLength={1000} style={{ minHeight: 80 }} defaultValue={r.admin_note || ''} /></div>
        <button className="btn" type="submit" disabled={busy}><Busy busy={busy}><Icon n="check" /> حفظ</Busy></button>
      </form>
    </Modal>
  );
}

export function AdminReqs() {
  const [flt, setFlt] = useState('');
  const [edit, setEdit] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const r = await sb.from('book_requests').select('*').order('created_at', { ascending: false });
    if (r.error) throw r.error; return r.data || [];
  }, []);
  if (error) return <AdminError error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const rows = data.filter(r => !flt || r.status === flt);
  return (
    <>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button className={'chip' + (flt === '' ? ' on' : '')} type="button" onClick={() => setFlt('')}>الكل ({data.length})</button>
        {Object.entries(REQ_STATUS).map(([k, [t]]) => <button key={k} className={'chip' + (flt === k ? ' on' : '')} type="button" onClick={() => setFlt(k)}>{t}</button>)}
      </div>
      {rows.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>الكتاب</th><th>الطالب</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id}>
              <td>{r.title}<div className="muted" style={{ fontSize: '.8rem' }}>{r.subject} · {r.grade}{r.details ? ' — ' + r.details : ''}</div></td>
              <td>{r.student_name}</td><td><BadgeStatus st={r.status} /></td><td>{fmtDate(r.created_at)}</td>
              <td><button className="btn sm ghost" type="button" onClick={() => setEdit(r)}><Icon n="edit" s={15} /> تحديث</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <div className="card empty">لا توجد طلبات.</div>}
      {edit && <ReqModal r={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}
