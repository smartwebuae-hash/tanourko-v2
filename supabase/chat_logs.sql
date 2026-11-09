-- جدول محادثات مساعد تنوركو (يظهر في صفحة «زوار الموقع»)
create table if not exists public.chat_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor text, convo text, page text,
  role text,            -- user = الزبون، bot = المساعد، event = إضافة للسلة من الشات
  text text,
  dishes text[],        -- الأطباق اللي انعرضت بصورها
  handoff boolean default false,  -- المساعد حوّل الزبون للاتصال/الواتساب
  mode text,            -- ai = ذكاء اصطناعي، local = بحث في المنيو بدون ذكاء
  source text, city text, country_code text
);
create index if not exists chat_logs_created_idx on public.chat_logs (created_at desc);
alter table public.chat_logs enable row level security;
grant insert on public.chat_logs to anon, authenticated;
grant select, delete on public.chat_logs to authenticated;
drop policy if exists "log chats" on public.chat_logs;
create policy "log chats" on public.chat_logs for insert to anon, authenticated
  with check (char_length(coalesce(text,''))<=2000 and char_length(coalesce(convo,''))<=40 and coalesce(array_length(dishes,1),0)<=8);
drop policy if exists "admins read chats" on public.chat_logs;
create policy "admins read chats" on public.chat_logs for select to authenticated
  using (exists (select 1 from public.menu_admins m where lower(m.email)=lower(auth.jwt()->>'email')));
drop policy if exists "admins delete chats" on public.chat_logs;
create policy "admins delete chats" on public.chat_logs for delete to authenticated
  using (exists (select 1 from public.menu_admins m where lower(m.email)=lower(auth.jwt()->>'email')));
