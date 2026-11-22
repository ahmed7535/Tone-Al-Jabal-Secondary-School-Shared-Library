'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { Busy, Gate, Page, PageHead } from '@/components/ui';
import { useApp, useAction } from '@/components/AppProvider';
import { sb } from '@/lib/supabase';
import { UErr } from '@/lib/utils';

export default function ConcernsPage() {
  const { ready, profile, toast } = useApp();
  const [busy, run] = useAction();
  const [len, setLen] = useState(0);
  if (!ready) return null;
  if (!profile) return <Gate msg="سجّل الدخول لاستخدام هذا القسم" />;

  const submit = e => {
    e.preventDefault();
    const f = e.currentTarget, body = String(new FormData(f).get('body') || '').trim();
    run(async () => {
      if (body.length < 5) throw new UErr('اكتب رسالة لا تقل عن 5 أحرف.');
      const r = await sb.from('complaints').insert({ body }); // بدون user_id وبدون إرجاع بيانات
      if (r.error) throw r.error;
      f.reset(); setLen(0);
      toast('تم إرسال رسالتك. شكرًا لثقتك.', 'success');
    });
  };

  return (
    <Page>
      <PageHead title="ملاحظات واقتراحات" crumb={<><Link href="/">الرئيسية</Link> ‹ مساحة خاصة</>} />
      <div className="card" style={{ maxWidth: 720, marginInline: 'auto' }}>
        <div className="notice"><Icon n="lock" s={16} /> <b>كيف تُعالج رسالتك؟</b> لا نحفظ اسمك أو حسابك مع الرسالة، ولا توجد في الموقع أي واجهة لقراءتها (لا للإدارة ولا لغيرها). الإرسال يتطلب تسجيل الدخول فقط لمنع الإساءة. لا نعد بسرية مطلقة: من يملك الإدارة التقنية لقاعدة البيانات قد يمتلك وصولًا تقنيًا إليها.</div>
        <div className="spacer" />
        <div className="notice err"><b>مهم:</b> لأن هذه الرسائل غير مرتبطة بك ولا تصل لأحد بشكل مباشر، فإن كنت في خطر أو يؤذيك أحد، تحدث فورًا مع شخص بالغ تثق به (والد، معلم، أخصائي اجتماعي).</div>
        <div className="spacer" />
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="cb">اكتب رسالتك هنا: ملاحظة أو مشكلة أو اقتراح</label>
            <textarea id="cb" name="body" minLength={5} maxLength={3000} style={{ minHeight: 220 }} required onChange={e => setLen(e.target.value.length)} />
            <span className="hint">{len} / 3000</span></div>
          <button className="btn block" type="submit" disabled={busy}><Busy busy={busy}><Icon n="chat" /> إرسال</Busy></button>
        </form>
      </div>
    </Page>
  );
}
