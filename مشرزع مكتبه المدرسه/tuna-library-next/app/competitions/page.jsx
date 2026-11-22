'use client';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { ErrorCard, Loading, Page, PageHead } from '@/components/ui';
import { useLoad } from '@/components/useLoad';
import { sb } from '@/lib/supabase';
import { compState, fmtDate } from '@/lib/utils';

function CompCard({ c }) {
  const [t, k] = compState(c);
  return (
    <article className="card">
      <span className={'badge ' + k}>{t}</span>
      <h3 style={{ marginTop: 8 }}>{c.title}</h3>
      <p className="muted" style={{ margin: '6px 0 10px' }}>{c.description.slice(0, 140)}{c.description.length > 140 ? '…' : ''}</p>
      <p style={{ fontSize: '.85rem' }}><Icon n="trophy" s={15} /> {fmtDate(c.starts_at)} ← {fmtDate(c.ends_at)}</p>
      <div className="spacer" />
      <Link className="btn sm" href={`/competitions/${c.id}`}>التفاصيل والمشاركة</Link>
    </article>
  );
}

export default function CompetitionsPage() {
  const { data, error, reload } = useLoad(async () => {
    const r = await sb.from('competitions').select('*').order('starts_at', { ascending: false });
    if (r.error) throw r.error;
    return r.data || [];
  }, []);
  if (error) return <ErrorCard error={error} onRetry={reload} />;
  if (!data) return <Page><Loading /></Page>;
  const now = Date.now();
  const cur = data.filter(c => +new Date(c.ends_at) >= now), past = data.filter(c => +new Date(c.ends_at) < now);
  return (
    <Page>
      <PageHead title="مسابقات المكتبة" crumb={<><Link href="/">الرئيسية</Link> ‹ المسابقات</>} />
      <h2 style={{ marginBottom: 12 }}>الجارية والقادمة</h2>
      <div className="grid cols-2">
        {cur.length ? cur.map(c => <CompCard key={c.id} c={c} />) : <div className="card empty" style={{ gridColumn: '1/-1' }}>لا توجد مسابقات حاليًا.</div>}
      </div>
      <div className="spacer" />
      <h2 style={{ margin: '14px 0 12px' }}>المسابقات السابقة</h2>
      <div className="grid cols-2">
        {past.length ? past.map(c => <CompCard key={c.id} c={c} />) : <div className="card empty" style={{ gridColumn: '1/-1' }}>لا توجد مسابقات سابقة.</div>}
      </div>
    </Page>
  );
}
