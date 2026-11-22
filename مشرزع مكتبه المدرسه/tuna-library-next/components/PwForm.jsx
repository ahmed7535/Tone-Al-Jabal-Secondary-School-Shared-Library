'use client';
import { useApp, useAction } from './AppProvider';
import Icon from './Icon';
import { Busy } from './ui';
import { UErr } from '@/lib/utils';

export function PwForm({ onDone }) {
  const { changePassword, toast } = useApp();
  const [busy, run] = useAction();
  const submit = e => {
    e.preventDefault();
    const f = e.currentTarget, fd = new FormData(f);
    run(async () => {
      if (fd.get('nw') !== fd.get('cf')) throw new UErr('كلمتا المرور الجديدتان غير متطابقتين.');
      await changePassword(String(fd.get('old')), String(fd.get('nw')));
      f.reset(); toast('تم تغيير كلمة المرور بنجاح.', 'success'); if (onDone) onDone();
    });
  };
  return (
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="pw-o">كلمة المرور الحالية</label>
        <input id="pw-o" name="old" type="password" autoComplete="current-password" required /></div>
      <div className="field"><label htmlFor="pw-n">كلمة المرور الجديدة</label>
        <input id="pw-n" name="nw" type="password" autoComplete="new-password" minLength={8} required />
        <span className="hint">8 أحرف على الأقل</span></div>
      <div className="field"><label htmlFor="pw-c">تأكيد كلمة المرور الجديدة</label>
        <input id="pw-c" name="cf" type="password" autoComplete="new-password" required /></div>
      <button className="btn" type="submit" disabled={busy}><Busy busy={busy}><Icon n="lock" /> تغيير كلمة المرور</Busy></button>
    </form>
  );
}
