-- Abollism schema (part 1)
-- Run this first in Supabase SQL Editor

-- Admins
create table if not exists admins (
  id uuid primary key references auth.users on delete cascade
);

-- Site settings (single row)
create table if not exists settings (
  id int primary key default 1,
  site_name text default 'Abollism',
  tagline text default '',
  hero_image_url text default '',
  contact text default ''
);

insert into settings (id, tagline)
values (1, 'ویترین کارهایم و تریبونی برای حرف‌های خودم')
on conflict (id) do nothing;

-- Projects (portfolio)
create table if not exists projects (
  id bigint generated always as identity primary key,
  title text not null,
  description text default '',
  tags text default '',
  url text default '',
  image_url text default '',
  sort_order int default 0,
  published bool default true,
  created_at timestamptz default now()
);

-- Blog posts
create table if not exists posts (
  id bigint generated always as identity primary key,
  title text not null,
  slug text unique not null,
  body text default '',
  cover_url text default '',
  published bool default true,
  created_at timestamptz default now()
);

-- Helper: is current user admin?
create or replace function is_admin()
returns bool
language sql
security definer
stable
as $$
  select exists (select 1 from admins where id = auth.uid())
$$;

-- RLS
alter table admins enable row level security;
alter table settings enable row level security;
alter table projects enable row level security;
alter table posts enable row level security;

create policy r_settings on settings for select using (true);
create policy w_settings on settings for all using (is_admin()) with check (is_admin());

create policy r_projects on projects for select using (published or is_admin());
create policy w_projects on projects for all using (is_admin()) with check (is_admin());

create policy r_posts on posts for select using (published or is_admin());
create policy w_posts on posts for all using (is_admin()) with check (is_admin());

-- Storage bucket for media
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy r_media on storage.objects
  for select using (bucket_id = 'media');

create policy w_media on storage.objects
  for all using (bucket_id = 'media' and is_admin())
  with check (bucket_id = 'media' and is_admin());

-- Seed projects (live pages where available)
insert into projects (title, description, tags, url, sort_order) values
(
  'SETCHI',
  'پلتفرم فارسی پیشنهاد استایل و ست لباس مردانه با کمک هوش مصنوعی',
  'Next.js, TypeScript, AI',
  'https://abolmoslehifsg-svg.github.io/setchi/',
  1
),
(
  'شطرنج ۴ نفره',
  'پروتوتایپ شطرنج دو در برابر دو روی صفحه ۱۶×۸ + حالت ۱v۱ و پازل',
  'JavaScript, Game',
  'https://abolmoslehifsg-svg.github.io/4-player-chess/',
  2
),
(
  'Still Focus',
  'اپ تمرکز و آرامش با تایمر و صداهای محیطی',
  'React, TypeScript',
  'https://abolmoslehifsg-svg.github.io/still-focus/',
  3
),
(
  'مدرسه شهید مدنی',
  'سایت / سامانه مدیریت مدرسه (نسخه پروتوتایپ)',
  'JavaScript, Web',
  'https://abolmoslehifsg-svg.github.io/madani-school/',
  4
)
on conflict do nothing;
