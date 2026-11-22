'use client';
import Icon from '../Icon';
import { Busy } from '../ui';
import { useApp, useAction } from '../AppProvider';
import { sb } from '@/lib/supabase';
import { UErr } from '@/lib/utils';

export function AdminSettings() {
  const { settings, loadSettings, toast } = useApp();
  const [busy, run] = useAction();
  const submit = e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(async () => {
      const name = String(fd.get('site_name') || '').trim();
      if (name.length < 3) throw new UErr('اسم المنصة قصير.');
      const now = new Date().toISOString();
      const rows = [
        { key: 'site_name', value: name },
        { key: 'announcement', value: String(fd.get('announcement') || '').trim() },
        { key: 'registration_open', value: fd.get('registration_open') === 'on' }
      ].map(r => ({ ...r, updated_at: now }));
      const r = await sb.from('site_settings').upsert(rows, { onConflict: 'key' }); if (r.error) throw r.error;
      await loadSettings(); toast('تم حفظ الإعدادات.', 'success');
    });
  };
  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 640 }}>
      <div className="field"><label htmlFor="s1">اسم المنصة</label><input id="s1" name="site_name" type="text" maxLength={120} defaultValue={settings.site_name} required /></div>
      <div className="field"><label htmlFor="s2">إعلان يظهر في الصفحة الرئيسية (اتركه فارغًا لإخفائه)</label>
        <textarea id="s2" name="announcement" maxLength={300} style={{ minHeight: 80 }} defaultValue={settings.announcement} /></div>
      <label className="check"><input type="checkbox" name="registration_open" defaultChecked={settings.registration_open !== false} /> السماح بإنشاء حسابات جديدة</label>
      <div className="spacer" />
      <button className="btn" type="submit" disabled={busy}><Busy busy={busy}><Icon n="check" /> حفظ الإعدادات</Busy></button>
    </form>
  );
}
