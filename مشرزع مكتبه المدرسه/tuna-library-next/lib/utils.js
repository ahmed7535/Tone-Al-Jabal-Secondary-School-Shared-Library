export const GRADES = ['الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي', 'جميع الصفوف'];
export const REQ_STATUS = {
  new: ['جديد', 'info'], in_progress: ['قيد المراجعة', 'warn'],
  available: ['تمت إضافته للمكتبة', 'ok'], rejected: ['تعذّر توفيره', 'bad']
};
export const NAME_RE = /^[\p{L}\p{M} ]{2,30}$/u;

export class UErr extends Error {}

export const fmtDate = d => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
export const fmtDT = d => new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
export const toLocalInput = iso => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
export const fullName = p => [p?.first_name, p?.second_name, p?.third_name].filter(Boolean).join(' ');

export function compState(c) {
  const n = Date.now(), s = +new Date(c.starts_at), e = +new Date(c.ends_at);
  return n < s ? ['لم تبدأ بعد', 'warn'] : n <= e ? ['جارية الآن', 'ok'] : ['انتهت', ''];
}

export function errMsg(e) {
  if (e instanceof UErr) return e.message;
  const m = (e && e.message) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'اسم المستخدم أو كلمة المرور غير صحيحة.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.';
  if (/row-level security|permission denied|not allowed/i.test(m)) return 'ليست لديك صلاحية لتنفيذ هذا الإجراء.';
  if (/duplicate key|unique/i.test(m)) return 'هذه البيانات مسجلة من قبل.';
  if (/Database error saving new user/i.test(m)) return 'تعذر إنشاء الحساب. قد يكون هذا الاسم مسجلًا بالفعل أو أن التسجيل مغلق حاليًا. جرّب تسجيل الدخول أو تواصل مع إدارة المكتبة.';
  if (/Email not confirmed/i.test(m)) return 'إعدادات Supabase تتطلب تأكيد البريد؛ على المسؤول تعطيل "Confirm email" (راجع README).';
  if (/rate limit|too many/i.test(m)) return 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.';
  if (/cannot_modify_own_role/i.test(m)) return 'لا يمكنك تغيير صلاحيات حسابك بنفسك.';
  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

/* اسم المستخدم → بريد داخلي ثابت. يجب أن يطابق دالة username_to_email في supabase.sql */
export const normUser = u => String(u || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
export async function toEmail(username) {
  const bytes = new TextEncoder().encode(normUser(username));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 40) + '@tuna-library.example.com';
}
export function genUsername() {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  return 'tuna' + String(a[0] % 1000000).padStart(6, '0');
}
