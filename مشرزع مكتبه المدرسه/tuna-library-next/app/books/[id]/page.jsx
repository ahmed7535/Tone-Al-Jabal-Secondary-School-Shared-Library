'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { BookCover, ErrorCard, Loading, NotFoundCard, Page, PageHead } from '@/components/ui';
import { useApp, useAction } from '@/components/AppProvider';
import { useLoad } from '@/components/useLoad';
import { sb } from '@/lib/supabase';
import { fmtDate } from '@/lib/utils';

export default function BookPage() {
  const { id } = useParams();
  const router = useRouter();
  const { ready, profile, favs, toggleFav, toast, logAct } = useApp();
  const [busyFav, runFav] = useAction();
  const [busyDl, runDl] = useAction();
  const counted = useRef(null);

  const { data: b, error, reload, loading } = useLoad(async () => {
    const r = await sb.from('books').select('*,book_categories(name)').eq('id', id).maybeSingle();
    if (r.error) throw r.error;
    return r.data || false;
  }, [id]);

  useEffect(() => {
    if (!ready || !profile || !b || counted.current === id) return;
    counted.current = id;
    sb.rpc('increment_book_views', { p_book_id: id }).then(() => {}, () => {});
    logAct('view_book', { book_id: id });
  }, [ready, profile, b, id, logAct]);

  if (error) return <ErrorCard error={error} onRetry={reload} />;
  if (b === null || loading && !b) return <Page><Loading /></Page>;
  if (b === false) return <NotFoundCard title="الكتاب غير موجود" href="/books" label="العودة للكتب" />;

  const download = () => runDl(async () => {
    if (!profile) { toast('سجّل الدخول لتحميل الكتب.'); router.push('/account'); return; }
    const { data, error } = await sb.storage.from('books').createSignedUrl(b.pdf_path, 120, { download: b.title.replace(/[\\/:*?"<>|]/g, '_') + '.pdf' });
    if (error) throw error;
    logAct('download', { book_id: b.id });
    const a = document.createElement('a'); a.href = data.signedUrl; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
  });

  return (
    <Page>
      <PageHead title={b.title} crumb={<><Link href="/books">الكتب</Link> ‹ تفاصيل الكتاب</>} />
      <div className="detail">
        <div className="cover" style={{ borderRadius: 20, boxShadow: 'var(--shadow)' }}><BookCover b={b} size={56} /></div>
        <div className="card">
          <div className="row">
            <span className="badge info">{b.subject}</span><span className="badge">{b.grade}</span>
            {b.book_categories && <span className="badge">{b.book_categories.name}</span>}
          </div>
          <h3 style={{ marginTop: 12 }}>المؤلف: {b.author}</h3>
          <p style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{b.description || 'لا يوجد وصف لهذا الكتاب.'}</p>
          <p className="muted" style={{ marginTop: 10 }}><Icon n="eye" s={16} /> {b.views_count + (profile ? 1 : 0)} مشاهدة · أُضيف {fmtDate(b.created_at)}</p>
          <div className="spacer" />
          <div className="row">
            <Link className="btn" href={`/preview/${b.id}`}><Icon n="eye" /> معاينة PDF</Link>
            {b.allow_download
              ? <button className="btn ghost" type="button" disabled={busyDl} onClick={download}><Icon n="download" /> تحميل</button>
              : <span className="badge warn">التحميل غير متاح لهذا الكتاب</span>}
            <button className={'btn ghost'} type="button" disabled={busyFav} onClick={() => runFav(() => toggleFav(b.id))}>
              <Icon n="heart" /> {favs.has(b.id) ? 'في المفضلة' : 'المفضلة'}
            </button>
          </div>
          {!profile && <p className="notice" style={{ marginTop: 14 }}>سجّل الدخول لمعاينة الكتاب أو تحميله.</p>}
        </div>
      </div>
    </Page>
  );
}
