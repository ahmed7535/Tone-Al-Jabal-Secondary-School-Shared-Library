'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb, IS_CONFIGURED } from '@/lib/supabase';
import { errMsg, toEmail, UErr } from '@/lib/utils';
import Modal from './Modal';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const DEFAULT_SETTINGS = { site_name: 'مكتبة مدرسة تونا الجبل الثانوية المشتركة', announcement: '', registration_open: true };

export function AppProvider({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [favs, setFavs] = useState(() => new Set());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [toasts, setToasts] = useState([]);
  const [theme, setThemeState] = useState('light');
  const [themePref, setThemePref] = useState('auto');
  const [bookFilter, setBookFilter] = useState({ q: '', cat: '', grade: '', mode: 'all' });
  const [confirmState, setConfirmState] = useState(null);
  const toastId = useRef(0);

  /* ---------- الإشعارات ---------- */
  const toast = useCallback((msg, type = 'info') => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4800);
  }, []);

  /* ---------- السمة ---------- */
  const applyTheme = useCallback(pref => {
    const t = pref === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref;
    document.documentElement.setAttribute('data-theme', t);
    setThemeState(t);
    const mt = document.querySelector('meta[name=theme-color]');
    if (mt) mt.content = t === 'dark' ? '#070e1f' : '#f5f6fa';
  }, []);
  const setPref = useCallback(v => {
    try { localStorage.setItem('theme', v); } catch (e) { /* التخزين غير متاح */ }
    setThemePref(v); applyTheme(v);
  }, [applyTheme]);
  useEffect(() => {
    let p = 'auto';
    try { p = localStorage.getItem('theme') || 'auto'; } catch (e) { /* */ }
    setThemePref(p); applyTheme(p);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => { let q = 'auto'; try { q = localStorage.getItem('theme') || 'auto'; } catch (e) { /* */ } if (q === 'auto') applyTheme('auto'); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [applyTheme]);

  /* ---------- البيانات الأساسية ---------- */
  const loadSettings = useCallback(async () => {
    if (!sb) return;
    const { data } = await sb.from('site_settings').select('key,value');
    if (data) setSettings(s => { const n = { ...s }; data.forEach(r => { n[r.key] = r.value; }); return n; });
  }, []);

  const loadProfile = useCallback(async sess => {
    if (!sb || !sess) { setProfile(null); setFavs(new Set()); return null; }
    const { data, error } = await sb.from('profiles').select('*').eq('id', sess.user.id).maybeSingle();
    if (error) throw error;
    if (!data || data.is_active === false) {
      await sb.auth.signOut(); setSession(null); setProfile(null); setFavs(new Set());
      toast('هذا الحساب غير متاح. تواصل مع إدارة المكتبة.', 'error'); return null;
    }
    setProfile(data);
    const f = await sb.from('favorites').select('book_id').eq('user_id', data.id);
    setFavs(new Set((f.data || []).map(r => r.book_id)));
    return data;
  }, [toast]);

  const refreshProfile = useCallback(async () => {
    const { data } = await sb.auth.getSession();
    setSession(data.session);
    return loadProfile(data.session);
  }, [loadProfile]);

  useEffect(() => {
    if (!sb) { setReady(true); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (!alive) return;
        setSession(data.session);
        if (data.session) await loadProfile(data.session);
        await loadSettings();
      } catch (e) { console.error(e); toast(errMsg(e), 'error'); }
      if (alive) setReady(true);
    })();
    const { data: sub } = sb.auth.onAuthStateChange((ev, sess) => {
      if (ev === 'SIGNED_OUT') { setSession(null); setProfile(null); setFavs(new Set()); }
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile, loadSettings, toast]);

  /* ---------- أفعال ---------- */
  const isAdmin = !!profile && profile.role === 'admin';

  const logAct = useCallback((action, details) => {
    if (!profile || !sb) return;
    sb.from('activity_logs').insert({ user_id: profile.id, action, details: details || null }).then(() => {}, () => {});
  }, [profile]);

  const signIn = useCallback(async (username, password) => {
    const { data, error } = await sb.auth.signInWithPassword({ email: await toEmail(username), password });
    if (error) throw error;
    setSession(data.session);
    const p = await loadProfile(data.session);
    if (p) {
      sb.from('activity_logs').insert({ user_id: p.id, action: 'login', details: null }).then(() => {}, () => {});
    }
    return p;
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await sb.auth.signOut();
    setSession(null); setProfile(null); setFavs(new Set());
    toast('تم تسجيل الخروج بأمان.', 'success');
    router.push('/');
  }, [router, toast]);

  const changePassword = useCallback(async (oldPw, newPw) => {
    if (newPw.length < 8) throw new UErr('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.');
    if (newPw === oldPw) throw new UErr('اختر كلمة مرور مختلفة عن الحالية.');
    const chk = await sb.auth.signInWithPassword({ email: await toEmail(profile.username), password: oldPw });
    if (chk.error) throw new UErr('كلمة المرور الحالية غير صحيحة.');
    const up = await sb.auth.updateUser({ password: newPw });
    if (up.error) throw up.error;
    const r = await sb.rpc('clear_must_change_password'); if (r.error) throw r.error;
    await refreshProfile();
  }, [profile, refreshProfile]);

  const toggleFav = useCallback(async id => {
    if (!profile) { toast('سجّل الدخول لإضافة الكتب إلى المفضلة.'); router.push('/account'); return; }
    const on = favs.has(id);
    const r = on ? await sb.from('favorites').delete().eq('user_id', profile.id).eq('book_id', id)
                 : await sb.from('favorites').insert({ user_id: profile.id, book_id: id });
    if (r.error) throw r.error;
    setFavs(prev => { const n = new Set(prev); if (on) n.delete(id); else n.add(id); return n; });
    toast(on ? 'أُزيل الكتاب من المفضلة.' : 'أُضيف الكتاب إلى المفضلة.', 'success');
  }, [profile, favs, router, toast]);

  const confirmDialog = useCallback(msg => new Promise(res => setConfirmState({ msg, res })), []);

  const value = useMemo(() => ({
    ready, session, profile, favs, settings, isAdmin, theme, themePref, setPref, toast,
    bookFilter, setBookFilter, loadSettings, loadProfile, refreshProfile, logAct,
    signIn, signOut, changePassword, toggleFav, confirmDialog, setSession
  }), [ready, session, profile, favs, settings, isAdmin, theme, themePref, setPref, toast, bookFilter,
    loadSettings, loadProfile, refreshProfile, logAct, signIn, signOut, changePassword, toggleFav, confirmDialog]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div id="toasts" role="status">
        {toasts.map(t => <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>)}
      </div>
      {confirmState && (
        <ConfirmModal msg={confirmState.msg} onDone={v => { confirmState.res(v); setConfirmState(null); }} />
      )}
    </Ctx.Provider>
  );
}

function ConfirmModal({ msg, onDone }) {
  return (
    <Modal title="تأكيد" onClose={() => onDone(false)}>
      <p>{msg}</p>
      <div className="spacer" />
      <div className="row">
        <button className="btn danger" type="button" onClick={() => onDone(true)}>نعم، تابع</button>
        <button className="btn ghost" type="button" onClick={() => onDone(false)}>إلغاء</button>
      </div>
    </Modal>
  );
}

/* هوك للإجراءات: يمنع التكرار ويعالج الأخطاء */
export function useAction() {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = useCallback(async fn => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { return await fn(); }
    catch (err) { console.error(err); toast(errMsg(err), 'error'); }
    finally { lock.current = false; setBusy(false); }
  }, [toast]);
  return [busy, run];
}
