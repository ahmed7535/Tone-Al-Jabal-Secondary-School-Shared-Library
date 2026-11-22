'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { Page, PwInput, TextInput, Busy } from '@/components/ui';
import { useApp, useAction } from '@/components/AppProvider';
import { sb } from '@/lib/supabase';
import { NAME_RE, UErr, genUsername, normUser, toEmail } from '@/lib/utils';

function strength(v) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[a-z؀-ۿ]/.test(v) && /[A-Z\d]/.test(v)) s++;
  if (/\d/.test(v) && /\D/.test(v)) s++;
  if (v.length >= 12 || /[^\w\s؀-ۿ]/.test(v)) s++;
  if (v.length < 8) s = Math.min(s, 1);
  return s;
}
const S_NAMES = ['', 'ضعيفة', 'مقبولة', 'جيدة', 'قوية'];

export default function AccountPage() {
  const router = useRouter();
  const { profile, ready, settings } = useApp();
  const [tab, setTab] = useState('reg');
  const [created, setCreated] = useState(null);
  const [hold, setHold] = useState(false); // يمنع التحويل أثناء إنشاء الحساب لعرض اسم المستخدم

  useEffect(() => { if (ready && profile && !created && !hold) router.replace('/dashboard'); }, [ready, profile, created, hold, router]);
  if (!ready || (profile && !created && !hold)) return null;

  return (
    <Page>
      <div className="auth-shell">
        <aside className="auth-side">
          <div className="auth-logo-stage"><div className="auth-emblem"><img src="/school-logo.jpg" alt="شعار مدرسة تونا الجبل الثانوية المشتركة" /></div></div>
          <h2>مكتبتك المدرسية <em>في مكان واحد</em></h2>
          <p>سهّل حسابك لتصفّح الكتب والمذكرات، وحفظ مفضلتك، والاشتراك في المسابقات.</p>
          <ul className="auth-feats">
            <li><Icon n="trophy" s={24} /><span>مسابقات متعددة</span></li>
            <li><Icon n="star" s={24} /><span>محتوى مميز ومحدّث</span></li>
            <li><Icon n="book" s={24} /><span>مذكرات وكتب شاملة</span></li>
          </ul>
          <svg className="auth-books" viewBox="0 0 240 210" aria-hidden="true">
            <rect x="8" y="158" width="212" height="38" rx="6" fill="#1e4fc2" /><rect x="18" y="166" width="196" height="20" rx="3" fill="#f4f7ff" />
            <rect x="26" y="122" width="190" height="36" rx="6" fill="#f2b61e" /><rect x="34" y="130" width="176" height="20" rx="3" fill="#fff7de" />
            <rect x="38" y="90" width="172" height="32" rx="6" fill="#1b46b0" /><rect x="46" y="97" width="156" height="18" rx="3" fill="#eef3ff" />
            <path d="M122 30 204 62 122 94 40 62z" fill="#0a1f55" /><path d="M76 78v18c0 8 22 14 46 14s46-6 46-14V78l-46 18z" fill="#14307a" />
            <path d="M196 66v32" stroke="#e9b43c" strokeWidth="3" /><circle cx="196" cy="102" r="5" fill="#e9b43c" />
          </svg>
        </aside>
        <section className="auth-main">
          {!created && (
            <div className="tabs">
              <button className={tab === 'reg' ? 'on' : ''} type="button" onClick={() => setTab('reg')}><Icon n="userplus" s={18} /> إنشاء حساب</button>
              <button className={tab === 'login' ? 'on' : ''} type="button" onClick={() => setTab('login')}><Icon n="enter" s={18} /> تسجيل الدخول</button>
            </div>
          )}
          {created ? <Created username={created} />
            : tab === 'login' ? <LoginForm />
            : settings.registration_open === false ? <div className="notice">التسجيل مغلق حاليًا. تواصل مع إدارة المكتبة.</div>
            : <RegisterForm onCreated={setCreated} onHold={setHold} />}
        </section>
      </div>
    </Page>
  );
}

function LoginForm() {
  const router = useRouter();
  const { signIn, toast } = useApp();
  const [busy, run] = useAction();
  const submit = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const username = normUser(fd.get('username')), password = String(fd.get('password') || '');
      if (!username || !password) throw new UErr('أدخل اسم المستخدم وكلمة المرور.');
      const p = await signIn(username, password);
      if (!p) return;
      toast('أهلًا بك، تم تسجيل الدخول.', 'success');
      router.push('/dashboard');
    });
  };
  return (
    <>
      <h2 className="auth-title">أهلًا بك مجددًا <span aria-hidden="true">👋</span></h2>
      <p className="auth-sub">ادخل بياناتك للاستفادة من خدمات المكتبة.</p>
      <form onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="lu">اسم المستخدم</label>
          <TextInput icon="user" id="lu" name="username" type="text" autoComplete="username" placeholder="اسم المستخدم" required /></div>
        <div className="field"><label htmlFor="lp">كلمة المرور</label>
          <PwInput id="lp" name="password" autoComplete="current-password" /></div>
        <button className="btn block" type="submit" disabled={busy}><Busy busy={busy}><Icon n="enter" /> تسجيل الدخول</Busy></button>
        <div className="auth-note"><Icon n="lock" s={16} /><span>نسيت اسم المستخدم أو كلمة المرور؟ تواصل مع إدارة المكتبة لإعادة تعيين كلمة المرور بأمان.</span></div>
      </form>
    </>
  );
}

function RegisterForm({ onCreated, onHold }) {
  const { setSession, loadProfile } = useApp();
  const [busy, run] = useAction();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const s = strength(p1);

  const submit = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const first = String(fd.get('first')).trim(), second = String(fd.get('second')).trim(), third = String(fd.get('third')).trim();
      const pw = String(fd.get('password')), cf = String(fd.get('confirm'));
      if (![first, second, third].every(n => NAME_RE.test(n))) throw new UErr('اكتب الأسماء الثلاثة بحروف فقط (من 2 إلى 30 حرفًا لكل اسم).');
      if (pw.length < 8) throw new UErr('كلمة المرور يجب ألا تقل عن 8 أحرف.');
      if (pw !== cf) throw new UErr('كلمتا المرور غير متطابقتين.');
      let username = null, result = null;
      for (let i = 0; i < 6 && !result; i++) {
        const u = genUsername();
        const r = await sb.auth.signUp({
          email: await toEmail(u), password: pw,
          options: { data: { username: u, first_name: first, second_name: second, third_name: third } }
        });
        if (r.error) { if (/already|registered/i.test(r.error.message)) continue; throw r.error; }
        username = u; result = r.data;
      }
      if (!result) throw new UErr('تعذر توليد اسم مستخدم فريد. أعد المحاولة.');
      if (!result.session) throw new UErr('الحساب أُنشئ لكن Supabase يطلب تأكيد البريد. على المسؤول تعطيل "Confirm email" (راجع README).');
      onHold(true);
      try {
        setSession(result.session);
        await loadProfile(result.session);
        onCreated(username);
      } finally { onHold(false); }
    });
  };

  return (
    <>
      <h2 className="auth-title">أهلًا بك <span aria-hidden="true">👋</span></h2>
      <p className="auth-sub">ادخل بياناتك للاستفادة من خدمات المكتبة.</p>
      <form onSubmit={submit} noValidate>
        <div className="name-grid">
          <div className="field"><label htmlFor="n1">الاسم الأول</label>
            <TextInput icon="user" id="n1" name="first" type="text" maxLength={30} placeholder="مثال: أحمد" autoComplete="given-name" required /></div>
          <div className="field"><label htmlFor="n2">الاسم الثاني</label>
            <TextInput icon="user" id="n2" name="second" type="text" maxLength={30} placeholder="مثال: محمد" required /></div>
          <div className="field"><label htmlFor="n3">الاسم الثالث</label>
            <TextInput icon="user" id="n3" name="third" type="text" maxLength={30} placeholder="مثال: علي" required /></div>
        </div>
        <div className="field"><label htmlFor="p1">كلمة المرور <Icon n="cap" s={18} /></label>
          <PwInput id="p1" name="password" autoComplete="new-password" minLength={8} value={p1} onChange={e => setP1(e.target.value)} />
          <div className="pw-meter" data-s={p1 ? s : 0}>
            <span className="pw-ok"><Icon n="shield" s={18} /></span>
            <div className="pw-bars"><i /><i /><i /><i /></div>
            <span className="pw-label">{p1 ? 'كلمة المرور: ' + S_NAMES[s || 1] : '8 أحرف على الأقل'}</span>
          </div>
        </div>
        <div className="field"><label htmlFor="p2">تأكيد كلمة المرور <Icon n="shield" s={18} /></label>
          <PwInput id="p2" name="confirm" autoComplete="new-password" value={p2} onChange={e => setP2(e.target.value)}
            className={p2 ? (p2 === p1 ? 'good' : 'bad') : ''} /></div>
        <button className="btn block" type="submit" disabled={busy}><Busy busy={busy}><Icon n="enter" /> إنشاء الحساب</Busy></button>
        <div className="auth-note"><Icon n="shield" s={16} /><span>لا نطلب بريدًا إلكترونيًا؛ سيُنشأ لك اسم مستخدم تلقائيًا بعد التسجيل.</span></div>
      </form>
    </>
  );
}

function Created({ username }) {
  const { toast } = useApp();
  const copy = async () => {
    try { await navigator.clipboard.writeText(username); toast('تم النسخ.', 'success'); } catch (e) { toast('انسخه يدويًا من الشاشة.'); }
  };
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: 'var(--ok)' }}><Icon n="check" s={44} /></div>
      <h2>تم إنشاء حسابك</h2>
      <p className="muted">اسم المستخدم الخاص بك (احفظه جيدًا، ستحتاجه لتسجيل الدخول):</p>
      <div className="spacer" />
      <div className="big-user">{username}</div>
      <div className="spacer" />
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn ghost" type="button" onClick={copy}><Icon n="copy" /> نسخ</button>
        <Link className="btn" href="/dashboard">متابعة</Link>
      </div>
    </div>
  );
}
