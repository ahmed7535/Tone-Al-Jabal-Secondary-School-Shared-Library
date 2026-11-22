import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const IS_CONFIGURED = !!url && !!key && !/YOUR-/.test(url + key);

// عميل المتصفح فقط (مفتاح anon عام ومحمي بـ RLS). لا تضع service_role هنا أبدًا.
export const sb = IS_CONFIGURED
  ? createClient(url, key, { auth: { persistSession: typeof window !== 'undefined', autoRefreshToken: typeof window !== 'undefined' } })
  : null;
