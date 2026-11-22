'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ErrorCard, Gate, Loading, NotFoundCard, Page, PageHead } from '@/components/ui';
import { useApp } from '@/components/AppProvider';
import { useLoad } from '@/components/useLoad';
import { sb } from '@/lib/supabase';

export default function PreviewPage() {
  const { id } = useParams();
  const { ready, profile } = useApp();
  const { data, error, reload } = useLoad(async () => {
    if (!profile) return null;
    const r = await sb.from('books').select('id,title,pdf_path,allow_download').eq('id', id).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) return false;
    const s = await sb.storage.from('books').createSignedUrl(r.data.pdf_path, 3600);
    if (s.error) throw s.error;
    return { b: r.data, url: s.data.signedUrl };
  }, [id, profile?.id]);

  if (!ready) return null;
  if (!profile) return <Gate msg="سجّل الدخول لمعاينة الكتب" />;
  if (error) return <ErrorCard error={error} onRetry={reload} />;
  if (data === null) return <Page><Loading /></Page>;
  if (data === false) return <NotFoundCard title="الكتاب غير موجود" />;

  const { b, url } = data;
  const src = url + (b.allow_download ? '' : '#toolbar=0&navpanes=0');
  return (
    <Page>
      <PageHead title={'معاينة: ' + b.title} crumb={<Link href={`/books/${b.id}`}>العودة لتفاصيل الكتاب</Link>} />
      <iframe className="pdf-frame" src={src} title={`معاينة ${b.title}`} />
      <div className="spacer" />
      <div className="row">
        <a className="btn ghost" target="_blank" rel="noopener noreferrer" href={url}>فتح في نافذة جديدة</a>
        <span className="muted" style={{ fontSize: '.85rem' }}>إن لم تظهر المعاينة على هاتفك فافتحها في نافذة جديدة.</span>
      </div>
    </Page>
  );
}
