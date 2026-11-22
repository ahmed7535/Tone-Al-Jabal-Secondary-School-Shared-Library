-- =====================================================================
-- مكتبة مدرسة تونا الجبل الثانوية المشتركة — إعداد قاعدة بيانات Supabase
-- شغّل هذا الملف كاملًا في: Supabase Dashboard → SQL Editor → New query → Run
-- الملف قابل لإعادة التشغيل (idempotent) قدر الإمكان.
-- لا يحتوي أي كلمة مرور أو مفتاح سري.
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- 1) دوال مساعدة لأسماء المستخدمين
--    الطالب لا يرى بريدًا إلكترونيًا؛ نشتق بريدًا داخليًا ثابتًا من اسم المستخدم.
--    يجب أن تطابق هذه الدالة تمامًا دالة toEmail في index.html
-- ---------------------------------------------------------------------
create or replace function public.normalize_username(u text)
returns text language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(u,'')), '\s+', ' ', 'g'))
$$;

create or replace function public.username_to_email(u text)
returns text language sql immutable as $$
  select left(encode(sha256(convert_to(public.normalize_username(u), 'UTF8')), 'hex'), 40)
         || '@tuna-library.example.com'
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 2) الجداول
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  username             text not null,
  first_name           text,
  second_name          text,
  third_name           text,
  full_name_norm       text,
  role                 text not null default 'student' check (role in ('student','admin')),
  is_active            boolean not null default true,
  must_change_password boolean not null default false,
  created_at           timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 3 and 100)
);
create unique index if not exists profiles_username_key on public.profiles (username);
-- منع تكرار الحسابات: نفس الأسماء الثلاثة لا تُسجَّل مرتين
create unique index if not exists profiles_full_name_key on public.profiles (full_name_norm) where full_name_norm is not null;
create index if not exists profiles_role_idx on public.profiles (role);

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.book_categories (
  id         bigint generated always as identity primary key,
  name       text not null unique check (char_length(name) between 2 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(title) between 2 and 200),
  author         text not null check (char_length(author) between 2 and 150),
  subject        text not null check (char_length(subject) between 2 and 80),
  grade          text not null check (char_length(grade) between 2 and 80),
  description    text check (char_length(description) <= 3000),
  category_id    bigint references public.book_categories(id) on delete set null,
  cover_path     text,
  pdf_path       text not null,
  allow_download boolean not null default true,
  views_count    integer not null default 0 check (views_count >= 0),
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists books_created_idx  on public.books (created_at desc);
create index if not exists books_views_idx    on public.books (views_count desc);
create index if not exists books_category_idx on public.books (category_id);
create index if not exists books_grade_idx    on public.books (grade);
create index if not exists books_title_trgm   on public.books using gin (title gin_trgm_ops);
drop trigger if exists books_updated on public.books;
create trigger books_updated before update on public.books
  for each row execute function public.set_updated_at();

create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  book_id    uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index if not exists favorites_book_idx on public.favorites (book_id);

create table if not exists public.book_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  student_name text not null check (char_length(student_name) between 2 and 120),
  title        text not null check (char_length(title) between 2 and 200),
  subject      text not null check (char_length(subject) between 2 and 80),
  grade        text not null check (char_length(grade) between 2 and 80),
  details      text check (char_length(details) <= 2000),
  status       text not null default 'new' check (status in ('new','in_progress','available','rejected')),
  admin_note   text check (char_length(admin_note) <= 1000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists book_requests_user_idx   on public.book_requests (user_id, created_at desc);
create index if not exists book_requests_status_idx on public.book_requests (status);
drop trigger if exists book_requests_updated on public.book_requests;
create trigger book_requests_updated before update on public.book_requests
  for each row execute function public.set_updated_at();

create table if not exists public.competitions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 3 and 200),
  description  text not null check (char_length(description) <= 4000),
  conditions   text check (char_length(conditions) <= 3000),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  is_published boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint competitions_dates check (ends_at > starts_at)
);
create index if not exists competitions_dates_idx on public.competitions (starts_at desc, ends_at desc);

create table if not exists public.competition_participants (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  answer         text check (char_length(answer) <= 2000),
  created_at     timestamptz not null default now(),
  unique (competition_id, user_id)
);
create index if not exists comp_part_user_idx on public.competition_participants (user_id);

create table if not exists public.activity_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.profiles(id) on delete set null,
  action     text not null check (char_length(action) between 2 and 40),
  details    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_idx on public.activity_logs (action, created_at desc);

-- قسم "ما الذي يضايقك في المدرسة؟":
-- لا يوجد عمود user_id عمدًا؛ لا نحفظ هوية صاحب الرسالة.
create table if not exists public.complaints (
  id         bigint generated always as identity primary key,
  body       text not null check (char_length(body) between 5 and 3000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3) دوال الصلاحيات
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active)
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active)
$$;

-- ---------------------------------------------------------------------
-- 4) إنشاء الملف الشخصي تلقائيًا عند التسجيل + التحقق من المدخلات في الخادم
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_user   text  := m->>'username';
  v_first  text  := btrim(coalesce(m->>'first_name',''));
  v_second text  := btrim(coalesce(m->>'second_name',''));
  v_third  text  := btrim(coalesce(m->>'third_name',''));
  v_admin_exists boolean;
  v_open   boolean;
begin
  select exists (select 1 from public.profiles where role = 'admin') into v_admin_exists;

  -- مرحلة التهيئة الأولى فقط: إنشاء حساب الإدارة من لوحة Supabase بلا بيانات وصفية.
  if v_user is null then
    if v_admin_exists then
      raise exception 'signup_requires_metadata';
    end if;
    insert into public.profiles (id, username) values (new.id, 'user_' || substr(new.id::text, 1, 8));
    return new;
  end if;

  select coalesce((select (value)::boolean from public.site_settings where key = 'registration_open'), true)
    into v_open;
  if not v_open then raise exception 'registration_closed'; end if;

  if v_user !~ '^tuna[0-9]{6}$' then raise exception 'invalid_username'; end if;
  if new.email is distinct from public.username_to_email(v_user) then raise exception 'invalid_email'; end if;
  if char_length(v_first)  not between 2 and 30
  or char_length(v_second) not between 2 and 30
  or char_length(v_third)  not between 2 and 30 then
    raise exception 'invalid_name';
  end if;

  -- الدور دائمًا student مهما أرسل العميل
  insert into public.profiles (id, username, first_name, second_name, third_name, role)
  values (new.id, v_user, v_first, v_second, v_third, 'student');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- حماية حقول الصلاحيات في profiles
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.full_name_norm := case when new.first_name is null then null
    else public.normalize_username(new.first_name || ' ' || coalesce(new.second_name,'') || ' ' || coalesce(new.third_name,'')) end;

  if tg_op = 'UPDATE' then
    if auth.uid() is not null
       and coalesce(current_setting('app.bypass_guard', true), '') <> '1'
       and not public.is_admin() then
      new.id := old.id;
      new.role := old.role;
      new.is_active := old.is_active;
      new.username := old.username;
      new.must_change_password := old.must_change_password;
    end if;
    if auth.uid() is not null and auth.uid() = old.id
       and (new.role <> old.role or new.is_active <> old.is_active) then
      raise exception 'cannot_modify_own_role';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------
-- 5) دوال RPC
-- ---------------------------------------------------------------------
create or replace function public.increment_book_views(p_book_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.books set views_count = views_count + 1
  where id = p_book_id and auth.uid() is not null;
$$;

create or replace function public.clear_must_change_password()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.profiles set must_change_password = false where id = auth.uid();
end $$;

-- إحصائيات الإدارة (لا تتضمن الشكاوى إطلاقًا)
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'users',        (select count(*) from public.profiles),
    'books',        (select count(*) from public.books),
    'competitions', (select count(*) from public.competitions),
    'requests',     (select count(*) from public.book_requests),
    'new_requests', (select count(*) from public.book_requests where status = 'new'),
    'participants', (select count(*) from public.competition_participants),
    'favorites',    (select count(*) from public.favorites),
    'logins_30d',    (select count(*) from public.activity_logs where action = 'login'    and created_at > now() - interval '30 days'),
    'views_30d',     (select count(*) from public.activity_logs where action = 'view_book' and created_at > now() - interval '30 days'),
    'downloads_30d', (select count(*) from public.activity_logs where action = 'download'  and created_at > now() - interval '30 days'),
    'top_books', (select coalesce(jsonb_agg(t), '[]'::jsonb)
                  from (select id, title, views_count from public.books order by views_count desc, created_at desc limit 5) t)
  ) into r;
  return r;
end $$;

revoke execute on function public.increment_book_views(uuid)  from public, anon;
revoke execute on function public.clear_must_change_password() from public, anon;
revoke execute on function public.admin_stats()                from public, anon;
grant  execute on function public.increment_book_views(uuid)  to authenticated;
grant  execute on function public.clear_must_change_password() to authenticated;
grant  execute on function public.admin_stats()                to authenticated;

-- ---------------------------------------------------------------------
-- 6) Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.site_settings            enable row level security;
alter table public.book_categories          enable row level security;
alter table public.books                    enable row level security;
alter table public.favorites                enable row level security;
alter table public.book_requests            enable row level security;
alter table public.competitions             enable row level security;
alter table public.competition_participants enable row level security;
alter table public.activity_logs            enable row level security;
alter table public.complaints               enable row level security;

-- profiles
drop policy if exists profiles_select_own   on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_own   on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_select_own   on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_select_admin on public.profiles for select to authenticated using (public.is_admin());
create policy profiles_update_own   on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- site_settings
drop policy if exists settings_select on public.site_settings;
drop policy if exists settings_admin  on public.site_settings;
create policy settings_select on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin  on public.site_settings for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- book_categories
drop policy if exists cats_select on public.book_categories;
drop policy if exists cats_admin  on public.book_categories;
create policy cats_select on public.book_categories for select to anon, authenticated using (true);
create policy cats_admin  on public.book_categories for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- books
drop policy if exists books_select on public.books;
drop policy if exists books_admin  on public.books;
create policy books_select on public.books for select to anon, authenticated using (true);
create policy books_admin  on public.books for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- favorites
drop policy if exists fav_own on public.favorites;
create policy fav_own on public.favorites for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member());

-- book_requests
drop policy if exists req_select_own   on public.book_requests;
drop policy if exists req_select_admin on public.book_requests;
drop policy if exists req_insert_own   on public.book_requests;
drop policy if exists req_update_admin on public.book_requests;
drop policy if exists req_delete_admin on public.book_requests;
create policy req_select_own   on public.book_requests for select to authenticated using (user_id = auth.uid());
create policy req_select_admin on public.book_requests for select to authenticated using (public.is_admin());
create policy req_insert_own   on public.book_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'new' and admin_note is null and public.is_member());
create policy req_update_admin on public.book_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy req_delete_admin on public.book_requests for delete to authenticated using (public.is_admin());

-- competitions
drop policy if exists comp_select on public.competitions;
drop policy if exists comp_admin  on public.competitions;
create policy comp_select on public.competitions for select to anon, authenticated
  using (is_published or public.is_admin());
create policy comp_admin  on public.competitions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- competition_participants
drop policy if exists part_select_own   on public.competition_participants;
drop policy if exists part_select_admin on public.competition_participants;
drop policy if exists part_insert_own   on public.competition_participants;
drop policy if exists part_delete_admin on public.competition_participants;
create policy part_select_own   on public.competition_participants for select to authenticated using (user_id = auth.uid());
create policy part_select_admin on public.competition_participants for select to authenticated using (public.is_admin());
create policy part_insert_own   on public.competition_participants for insert to authenticated
  with check (
    user_id = auth.uid() and public.is_member()
    and exists (select 1 from public.competitions c
                where c.id = competition_id and c.is_published and now() between c.starts_at and c.ends_at)
  );
create policy part_delete_admin on public.competition_participants for delete to authenticated using (public.is_admin());

-- activity_logs
drop policy if exists log_insert_own   on public.activity_logs;
drop policy if exists log_select_admin on public.activity_logs;
create policy log_insert_own   on public.activity_logs for insert to authenticated
  with check (user_id = auth.uid() and public.is_member());
create policy log_select_admin on public.activity_logs for select to authenticated using (public.is_admin());

-- complaints: إدخال فقط. لا توجد أي سياسة SELECT/UPDATE/DELETE لأي دور،
-- ولذلك لا يستطيع أي مستخدم (ولا حتى Admin) قراءتها عبر واجهة الموقع أو REST API.
drop policy if exists complaints_insert on public.complaints;
create policy complaints_insert on public.complaints for insert to authenticated
  with check (public.is_member());
revoke all on public.complaints from anon, authenticated;
grant insert on public.complaints to authenticated;

-- ---------------------------------------------------------------------
-- 7) الإعدادات الافتراضية + التصنيفات الأولية
-- ---------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('site_name',         to_jsonb('مكتبة مدرسة تونا الجبل الثانوية المشتركة'::text)),
  ('announcement',      to_jsonb(''::text)),
  ('registration_open', 'true'::jsonb)
on conflict (key) do nothing;

insert into public.book_categories (name) values
  ('مناهج دراسية'), ('كتب مساعدة'), ('مراجعات واختبارات'), ('ثقافة عامة'), ('أدب وروايات'), ('علوم وتقنية')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- 8) التخزين Storage
--    covers: عام للقراءة (أغلفة فقط) | books: خاص، القراءة لمستخدم مسجّل فقط (روابط موقّعة)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('covers', 'covers', true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('books',  'books',  false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "covers read"         on storage.objects;
drop policy if exists "covers admin write"  on storage.objects;
drop policy if exists "covers admin update" on storage.objects;
drop policy if exists "covers admin delete" on storage.objects;
drop policy if exists "books member read"   on storage.objects;
drop policy if exists "books admin write"   on storage.objects;
drop policy if exists "books admin update"  on storage.objects;
drop policy if exists "books admin delete"  on storage.objects;

create policy "covers read"         on storage.objects for select to anon, authenticated using (bucket_id = 'covers');
create policy "covers admin write"  on storage.objects for insert to authenticated with check (bucket_id = 'covers' and public.is_admin());
create policy "covers admin update" on storage.objects for update to authenticated using (bucket_id = 'covers' and public.is_admin());
create policy "covers admin delete" on storage.objects for delete to authenticated using (bucket_id = 'covers' and public.is_admin());

create policy "books member read"   on storage.objects for select to authenticated using (bucket_id = 'books' and public.is_member());
create policy "books admin write"   on storage.objects for insert to authenticated with check (bucket_id = 'books' and public.is_admin());
create policy "books admin update"  on storage.objects for update to authenticated using (bucket_id = 'books' and public.is_admin());
create policy "books admin delete"  on storage.objects for delete to authenticated using (bucket_id = 'books' and public.is_admin());

-- =====================================================================
-- 9) إعداد حساب الإدارة (يدوي وآمن) — راجع README.md الخطوة 5
--    لا تُكتب كلمة المرور في أي ملف. تُدخل يدويًا في لوحة Supabase.
--
-- الخطوة أ) احصل على البريد الداخلي لحساب الإدارة (شغّل هذا السطر وحده):
--
--   select public.username_to_email('مكتبة مدرسة تونا الجبل الثانوية المشتركة');
--
-- الخطوة ب) Authentication → Users → Add user → Create new user
--    ضع البريد الناتج، وأدخل كلمة المرور الأولية بنفسك، وفعّل Auto Confirm User.
--
-- الخطوة ج) رقّ الحساب إلى Admin وأجبره على تغيير كلمة المرور (شغّل بعد الخطوة ب):
--
--   update public.profiles
--      set username = 'مكتبة مدرسة تونا الجبل الثانوية المشتركة',
--          role = 'admin',
--          must_change_password = true,
--          first_name = 'إدارة', second_name = 'المكتبة', third_name = 'المدرسية'
--    where id = (select id from auth.users
--                where email = public.username_to_email('مكتبة مدرسة تونا الجبل الثانوية المشتركة'));
--
-- مهم: أنشئ حساب الإدارة قبل نشر الموقع للطلاب.
-- =====================================================================
