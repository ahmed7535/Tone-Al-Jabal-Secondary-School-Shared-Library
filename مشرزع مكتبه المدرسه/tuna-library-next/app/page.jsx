'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import BookCard from '@/components/BookCard';
import { ErrorCard, Loading, Page, PageHead } from '@/components/ui';
import { useApp } from '@/components/AppProvider';
import { useLoad } from '@/components/useLoad';
import { sb } from '@/lib/supabase';
import { GRADES } from '@/lib/utils';

const MODES = [['all', 'كل الكتب'], ['new', 'المضافة حديثًا'], ['top', 'الأكثر مشاهدة'], ['fav', 'مفضلتي']];

export default function BooksPage() {
  const { ready, favs, profile, toast, bookFilter: f, setBookFilter } = useApp();
  const { data, error, reload } = useLoad(async () => {
    const [bk, cats] = await Promise.all([
      sb.from('books').select('*,book_categories(name)').order('created_at', { ascending: false }).limit(1000),
      sb.from('book_categories').select('*').order('name')
    ]);
    if (bk.error) throw bk.error;
    if (cats.error) throw cats.error;
    return { books: bk.data || [], cats: cats.data || [] };
  }, [ready]);

  // بحث مؤجل 200ms
  const [q, setQ] = useState(f.q);
  useEffect(() => { setQ(f.q); }, [f.q]);
  useEffect(() => {
    const t = setTimeout(() => { if (q !== f.q) setBookFilter(x => ({ ...x, q })); }, 200);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    if (!data) return [];
    let l = data.books.slice();
    const s = f.q.trim().toLowerCase();
    if (s) l = l.filter(b => [b.title, b.author, b.subject, b.description].some(v => String(v || '').toLowerCase().includes(s)));
    if (f.cat) l = l.filter(b => String(b.category_id) === String(f.cat));
    if (f.grade) l = l.filter(b => b.grade === f.grade);
    if (f.mode === 'fav') l = l.filter(b => favs.has(b.id));
    if (f.mode === 'top') l.sort((a, b) => b.views_count - a.views_count);
    if (f.mode === 'new') l = l.slice(0, 20);
    return l;
  }, [data, f, favs]);

  if (error) return <ErrorCard error={error} onRetry={reload} />;
  if (!data) return <Page><Loading /></Page>;

  const set = patch => setBookFilter(x => ({ ...x, ...patch }));
  return (
    <Page>
      <PageHead title="الكتب" crumb={<><Link href="/">الرئيسية</Link> ‹ الكتب</>} />
      <div className="card">
        <div className="grid cols-2" style={{ gap: 12 }}>
          <div className="field" style={{ margin: 0 }}><label htmlFor="bq">بحث</label>
            <input id="bq" type="search" placeholder="اسم الكتاب أو المؤلف أو المادة…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <div className="row" style={{ alignItems: 'end', flexWrap: 'nowrap' }}>
            <div className="field" style={{ margin: 0, flex: 1 }}><label htmlFor="bc">التصنيف</label>
              <select id="bc" value={String(f.cat)} onChange={e => set({ cat: e.target.value })}>
                <option value="">الكل</option>
                {data.cats.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select></div>
            <div className="field" style={{ margin: 0, flex: 1 }}><label htmlFor="bg">الصف</label>
              <select id="bg" value={f.grade} onChange={e => set({ grade: e.target.value })}>
                <option value="">الكل</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select></div>
          </div>
        </div>
        <div className="spacer" />
        <div className="chips">
          {MODES.map(([k, t]) => (
            <button key={k} className={'chip' + (f.mode === k ? ' on' : '')} type="button"
              onClick={() => { if (k === 'fav' && !profile) { toast('سجّل الدخول لعرض مفضلتك.'); return; } set({ mode: k }); }}>{t}</button>
          ))}
        </div>
      </div>
      <div className="spacer" />
      <div className="grid cols-auto">
        {list.length ? list.map(b => <BookCard key={b.id} b={b} />) : (
          <div className="card empty" style={{ gridColumn: '1/-1' }}><Icon n="book" s={40} /><p>{data.books.length ? 'لا توجد كتب مطابقة.' : 'لم تُضف أي كتب بعد.'}</p></div>
        )}
      </div>
    </Page>
  );
}
