# مكتبة مدرسة تونا الجبل الثانوية المشتركة — نسخة Next.js

نفس المنصة السابقة (نسخة Supabase) لكن مبنية بـ **Next.js 15 (App Router) + React 19**، وكل صفحة صارت مسارًا حقيقيًا بدل التوجيه بالـ hash.

> **حالة الاختبار:** فُحصت صياغة كل ملفات JSX وتحليل الاستيرادات بنجاح، لكن لم يُنفَّذ `npm install` ولا `next build` ولا اختبار على Supabase حقيقي لأن بيئة البناء بلا إنترنت. شغّل الخطوات أدناه ثم قائمة الاختبار قبل الإطلاق.

## التشغيل
```bash
npm install
cp .env.example .env.local     # ثم ضع قيم Supabase
npm run dev                    # http://localhost:3000
```
`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```
مفتاح anon عام ومحمي بـ RLS. **لا تضع `service_role` في أي ملف.**

## إعداد Supabase (لم يتغير)
1. أنشئ مشروعًا، ثم SQL Editor ← الصق `supabase/supabase.sql` ← Run.
2. Authentication ← Providers ← Email: عطّل **Confirm email**، وارفع الحد الأدنى لكلمة المرور إلى 8.
3. حساب الإدارة (قبل نشر الموقع للطلاب):
   ```sql
   select public.username_to_email('مكتبة مدرسة تونا الجبل الثانوية المشتركة');
   ```
   Authentication ← Users ← Add user بالبريد الناتج وكلمة المرور التي تختارها (Auto Confirm)، ثم:
   ```sql
   update public.profiles
      set username = 'مكتبة مدرسة تونا الجبل الثانوية المشتركة',
          role = 'admin', must_change_password = true,
          first_name = 'إدارة', second_name = 'المكتبة', third_name = 'المدرسية'
    where id = (select id from auth.users
                where email = public.username_to_email('مكتبة مدرسة تونا الجبل الثانوية المشتركة'));
   ```
   سجّل الدخول من "حسابك" باسم المستخدم نفسه؛ ستظهر شاشة تغيير كلمة المرور الإلزامي.
4. بعد النشر: Authentication ← URL Configuration ← Site URL = رابط موقعك.

## النشر
Vercel: ارفع المشروع (أو اربطه بـ GitHub) وأضف المتغيّرين أعلاه في Environment Variables. يعمل أيضًا على أي استضافة Node (`npm run build && npm start`).

## المسارات
| المسار | الصفحة |
|---|---|
| `/` | الرئيسية |
| `/account` | إنشاء حساب / دخول |
| `/dashboard` · `/profile` · `/settings` | حساب الطالب |
| `/books` · `/books/[id]` · `/preview/[id]` | الكتب والمعاينة |
| `/competitions` · `/competitions/[id]` | المسابقات |
| `/request` · `/concerns` | طلب كتاب / ملاحظات واقتراحات |
| `/admin` | لوحة الإدارة |

## هيكل المشروع
- `app/` المسارات (كلها Client Components لأن الصلاحيات تعتمد على RLS وجلسة المتصفح).
- `components/AppProvider.jsx` الجلسة والملف الشخصي والمفضلة والإعدادات والسمة والإشعارات وحوار التأكيد.
- `components/admin/` تبويبات لوحة الإدارة.
- `lib/supabase.js` العميل، `lib/utils.js` الأدوات و`toEmail`.
- `supabase/supabase.sql` قاعدة البيانات (دون تغيير). لا تغيّر `username_to_email` في SQL دون تغيير `toEmail` في `lib/utils.js`.

الملاحظات الأمنية والقيود المعروفة (قسم "ما الذي يضايقك"، استعادة الحساب، خيار منع التحميل…) كما في README النسخة السابقة وتنطبق كما هي.
