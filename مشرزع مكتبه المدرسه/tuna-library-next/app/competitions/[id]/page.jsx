'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Icon from '@/components/Icon';
import { Busy, ErrorCard, Loading, NotFoundCard, Page, PageHead } from '@/components/ui';
import { useApp, useAction } from '@/components/AppProvider';
import { useLoad } from '@/components/useLoad';
import { sb } from '@/lib/supabase';
import { compState, fmtDT } from '@/lib/utils';

export default function CompetitionPage() {
  const { id } = useParams();
  const { ready, profile, toast, logAct } = useApp();
  const [busy, run] = useAction();
  const { data, error, reload } = useLoad(async () => {
    if (!ready) return null;
    const r = await sb.from('competitions').select('*').eq('id', id).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) return false;
    let joined = false;
    if (profile) {
      const j = await sb.from('competition_participants').select('id').eq('competition_id', id).eq('user_id', profile.id).maybeSingle();
      joined = !!j.data;
    }
    return { c: r.data, joined };
  }, [id, ready, profile?.id]);

  if (error) return <ErrorCard error={error} onRetry={reload} />;
  if (data === null) return <Page><Loading /></Page>;
  if (data === false) return <NotFoundCard title="المسابقة غير موجودة" href="/competitions" label="المسابقات" />;

  const { c, joined } = data;
  const [t, k] = compState(c);
  const active = t === 'جارية الآن';

  const join = e => {
    e.preventDefault();
    const answer = String(new FormData(e.currentTarget).get('answer') || '').trim() || null;
    run(async () => {
      const r = await sb.from('competition_participants').insert({ competition_id: id, user_id: profile.id, answer });
      if (r.error) throw r.error;
      logAct('join_competition', { competition_id: id });
      toast('تم تسجيل مشاركتك. بالتوفيق!', 'success');
      reload();
    });
  };

  let action;
  if (!profile) action = <div className="notice">سجّل الدخول للمشاركة. <Link href="/account" style={{ fontWeight: 800, textDecoration: 'underline' }}>حسابك</Link></div>;
  else if (joined) action = <div className="notice" style={{ background: 'color-mix(in srgb,var(--ok) 15%,transparent)' }}><Icon n="check" s={18} /> تم تسجيل مشاركتك في هذه المسابقة.</div>;
  else if (!active) action = <div className="notice">{t === 'انتهت' ? 'انتهت هذه المسابقة.' : 'لم تبدأ المسابقة بعد.'}</div>;
  else action = (
    <form onSubmit={join}>
      <div className="field"><label htmlFor="ans">إجابتك أو ملاحظتك (اختياري)</label>
        <textarea id="ans" name="answer" maxLength={2000} style={{ minHeight: 100 }} /></div>
      <button className="btn" type="submit" disabled={busy}><Busy busy={busy}><Icon n="trophy" /> شارك الآن</Busy></button>
    </form>
  );

  return (
    <Page>
      <PageHead title={c.title} crumb={<><Link href="/competitions">المسابقات</Link> ‹ التفاصيل</>} />
      <div className="card">
        <span className={'badge ' + k}>{t}</span>
        <p style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>{c.description}</p>
        <div className="spacer" />
        <p><b>البداية:</b> {fmtDT(c.starts_at)}<br /><b>النهاية:</b> {fmtDT(c.ends_at)}</p>
        {c.conditions && <><div className="spacer" /><h3>شروط المشاركة</h3><p style={{ whiteSpace: 'pre-wrap' }}>{c.conditions}</p></>}
        <div className="spacer" />
        {action}
      </div>
    </Page>
  );
}
