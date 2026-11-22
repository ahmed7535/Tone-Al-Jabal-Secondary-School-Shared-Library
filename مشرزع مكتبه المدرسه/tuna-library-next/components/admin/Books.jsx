'use client';
import { useState } from 'react';
import Icon from '../Icon';
import Modal from '../Modal';
import { Busy, Loading } from '../ui';
import { AdminError } from './common';
import { useApp, useAction } from '../AppProvider';
import { useLoad } from '../useLoad';
import { sb } from '@/lib/supabase';
import { GRADES, UErr } from '@/lib/utils';

async function uploadFile(bucket, file, ext) {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

function BookForm({ book: b, cats, onClose, onSaved }) {
  const { profile, toast } = useApp();
  const [busy, run] = useAction();
  const submit = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const v = k => String(fd.get(k) || '').trim();
      const cover = fd.get('cover'), pdf = fd.get('pdf');
      if (v('title').length < 2 || v('author').length < 2 || v('subject').length < 2) throw new UErr('أكمل الحقول المطلوبة.');
      const hasCover = cover && cover.size > 0, hasPdf = pdf && pdf.size > 0;
      if (hasCover) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(cover.type)) throw new UErr('صيغة الغلاف غير مدعومة.');
        if (cover.size > 5 * 1024 * 1024) throw new UErr('حجم الغلاف يتجاوز 5 ميجابايت.');
      }
      if (!b && !hasPdf) throw new UErr('ملف PDF مطلوب عند إضافة كتاب.');
      if (hasPdf) {
        if (pdf.type !== 'application/pdf') throw new UErr('الملف يجب أن يكون PDF.');
        if (pdf.size > 50 * 1024 * 1024) throw new UErr('حجم الـ PDF يتجاوز 50 ميجابايت.');
      }
      const payload = {
        title: v('title'), author: v('author'), subject: v('subject'), grade: v('grade'), description: v('description') || null,
        category_id: v('category_id') ? Number(v('category_id')) : null, allow_download: fd.get('allow_download') === 'on'
      };
      const oldCover = b && b.cover_path, oldPdf = b && b.pdf_path;
      if (hasCover) payload.cover_path = await uploadFile('covers', cover, cover.type === 'image/png' ? 'png' : cover.type === 'image/webp' ? 'webp' : 'jpg');
      if (hasPdf) payload.pdf_path = await uploadFile('books', pdf, 'pdf');
      const r = b ? await sb.from('books').update(payload).eq('id', b.id) : await sb.from('books').insert({ ...payload, created_by: profile.id });
      if (r.error) throw r.error;
      if (b && hasCover && oldCover) sb.storage.from('covers').remove([oldCover]);
      if (b && hasPdf && oldPdf) sb.storage.from('books').remove([oldPdf]);
      toast('تم حفظ الكتاب.', 'success'); onSaved();
    });
  };
  const d = b || {};
  return (
    <Modal title={d.id ? 'تعديل كتاب' : 'إضافة كتاب'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="bf1">اسم الكتاب</label><input id="bf1" name="title" type="text" maxLength={200} defaultValue={d.title || ''} required /></div>
        <div className="field"><label htmlFor="bf2">المؤلف</label><input id="bf2" name="author" type="text" maxLength={150} defaultValue={d.author || ''} required /></div>
        <div className="field"><label htmlFor="bf3">المادة الدراسية</label><input id="bf3" name="subject" type="text" maxLength={80} defaultValue={d.subject || ''} required /></div>
        <div className="field"><label htmlFor="bf4">الصف</label>
          <select id="bf4" name="grade" required defaultValue={d.grade || GRADES[0]}>{GRADES.map(g => <option key={g}>{g}</option>)}</select></div>
        <div className="field"><label htmlFor="bf5">التصنيف</label>
          <select id="bf5" name="category_id" defaultValue={d.category_id ?? ''}><option value="">بدون</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label htmlFor="bf6">الوصف</label><textarea id="bf6" name="description" maxLength={3000} style={{ minHeight: 100 }} defaultValue={d.description || ''} /></div>
        <div className="field"><label htmlFor="bf7">الغلاف (JPG/PNG/WebP — حتى 5 ميجابايت){d.cover_path ? ' — اتركه فارغًا للإبقاء على الحالي' : ''}</label>
          <input id="bf7" name="cover" type="file" accept="image/jpeg,image/png,image/webp" /></div>
        <div className="field"><label htmlFor="bf8">ملف PDF (حتى 50 ميجابايت){d.id ? ' — اتركه فارغًا للإبقاء على الحالي' : ''}</label>
          <input id="bf8" name="pdf" type="file" accept="application/pdf" required={!d.id} /></div>
        <label className="check"><input type="checkbox" name="allow_download" defaultChecked={d.allow_download !== false} /> السماح بتحميل الكتاب</label>
        <div className="spacer" />
        <button className="btn" type="submit" disabled={busy}><Busy busy={busy}><Icon n="check" /> حفظ الكتاب</Busy></button>
      </form>
    </Modal>
  );
}

function CatsModal({ cats, reloadCats, onClose }) {
  const [busy, run] = useAction();
  const [busyD, runD] = useAction();
  const add = e => {
    e.preventDefault();
    const f = e.currentTarget, name = String(new FormData(f).get('name')).trim();
    run(async () => {
      if (name.length < 2) throw new UErr('اسم التصنيف قصير.');
      const r = await sb.from('book_categories').insert({ name }); if (r.error) throw r.error;
      f.reset(); reloadCats();
    });
  };
  const del = id => runD(async () => {
    const r = await sb.from('book_categories').delete().eq('id', id); if (r.error) throw r.error;
    reloadCats();
  });
  return (
    <Modal title="إدارة التصنيفات" onClose={onClose}>
      <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={add}>
        <input name="name" type="text" maxLength={60} placeholder="اسم تصنيف جديد" required />
        <button className="btn" type="submit" disabled={busy}><Icon n="plus" s={16} /></button>
      </form>
      <div className="spacer" />
      <div>
        {cats.length ? cats.map(c => (
          <div key={c.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span>{c.name}</span>
            <button className="btn sm danger" type="button" disabled={busyD} onClick={() => del(c.id)}><Icon n="trash" s={14} /></button>
          </div>
        )) : <p className="muted">لا توجد تصنيفات.</p>}
      </div>
    </Modal>
  );
}

export function AdminBooks() {
  const { toast, confirmDialog } = useApp();
  const [form, setForm] = useState(null);       // null | { book }
  const [catsOpen, setCatsOpen] = useState(false);
  const [busy, run] = useAction();
  const { data, error, reload } = useLoad(async () => {
    const [bk, cats] = await Promise.all([
      sb.from('books').select('*,book_categories(name)').order('created_at', { ascending: false }),
      sb.from('book_categories').select('*').order('name')
    ]);
    if (bk.error) throw bk.error; if (cats.error) throw cats.error;
    return { list: bk.data || [], cats: cats.data || [] };
  }, []);
  if (error) return <AdminError error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const { list, cats } = data;

  const del = b => run(async () => {
    if (!await confirmDialog(`حذف الكتاب "${b.title}" نهائيًا مع ملفاته؟`)) return;
    const r = await sb.from('books').delete().eq('id', b.id); if (r.error) throw r.error;
    if (b.cover_path) await sb.storage.from('covers').remove([b.cover_path]);
    if (b.pdf_path) await sb.storage.from('books').remove([b.pdf_path]);
    toast('تم حذف الكتاب.', 'success'); reload();
  });

  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" type="button" onClick={() => setForm({ book: null })}><Icon n="plus" /> إضافة كتاب</button>
        <button className="btn ghost" type="button" onClick={() => setCatsOpen(true)}>إدارة التصنيفات</button>
      </div>
      {list.length ? (
        <div className="table-wrap"><table>
          <thead><tr><th>الكتاب</th><th>المادة / الصف</th><th>التصنيف</th><th>مشاهدات</th><th>إجراءات</th></tr></thead>
          <tbody>{list.map(b => (
            <tr key={b.id}>
              <td>{b.title}<div className="muted" style={{ fontSize: '.8rem' }}>{b.author}</div></td>
              <td>{b.subject} · {b.grade}</td><td>{b.book_categories?.name || '—'}</td><td>{b.views_count}</td>
              <td><div className="row">
                <button className="btn sm ghost" type="button" onClick={() => setForm({ book: b })}><Icon n="edit" s={15} /> تعديل</button>
                <button className="btn sm danger" type="button" disabled={busy} onClick={() => del(b)}><Icon n="trash" s={15} /> حذف</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <div className="card empty">لا توجد كتب بعد. أضف أول كتاب.</div>}
      {form && <BookForm book={form.book} cats={cats} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {catsOpen && <CatsModal cats={cats} reloadCats={reload} onClose={() => setCatsOpen(false)} />}
    </>
  );
}
