-- Abollism schema (part 2)
-- Run this after schema.sql

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-zA-Z0-9_]{3,20}$'),
  created_at timestamptz default now()
);

-- Invite codes
create table if not exists invites (
  code text primary key,
  used_by uuid,
  created_at timestamptz default now()
);

-- Signup trigger: first user becomes admin, others need valid invite
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv text := new.raw_user_meta_data->>'invite';
  un text := new.raw_user_meta_data->>'username';
begin
  if exists (select 1 from admins) then
    update invites
    set used_by = new.id
    where code = inv and used_by is null;

    if not found then
      raise exception 'invalid invite';
    end if;
  else
    insert into admins (id) values (new.id);
  end if;

  insert into profiles (id, username) values (new.id, un);
  return new;
end;
$$;

drop trigger if exists on_signup on auth.users;
create trigger on_signup
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-fill username on comments/messages
create or replace function set_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select username into new.username from profiles where id = new.user_id;
  return new;
end;
$$;

-- Comments
create table if not exists comments (
  id bigint generated always as identity primary key,
  post_id bigint references posts on delete cascade,
  user_id uuid default auth.uid() references auth.users on delete cascade,
  username text,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz default now()
);

drop trigger if exists c_un on comments;
create trigger c_un
  before insert on comments
  for each row execute function set_username();

-- Reactions (like/dislike on posts or comments)
create table if not exists reactions (
  user_id uuid default auth.uid() references auth.users on delete cascade,
  kind text check (kind in ('post', 'comment')),
  target bigint,
  value smallint check (value in (1, -1)),
  primary key (user_id, kind, target)
);

-- Chat rooms
create table if not exists rooms (
  id bigint generated always as identity primary key,
  type text not null check (type in ('dm', 'group', 'channel')),
  name text,
  created_at timestamptz default now()
);

create table if not exists room_members (
  room_id bigint references rooms on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text default 'member',
  primary key (room_id, user_id)
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  room_id bigint references rooms on delete cascade,
  user_id uuid default auth.uid() references auth.users on delete cascade,
  username text,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz default now()
);

drop trigger if exists m_un on messages;
create trigger m_un
  before insert on messages
  for each row execute function set_username();

-- Helpers for chat RLS
create or replace function is_member(rid bigint)
returns bool
language sql
security definer
stable
as $$
  select exists (
    select 1 from room_members
    where room_id = rid and user_id = auth.uid()
  )
$$;

create or replace function can_post(rid bigint)
returns bool
language sql
security definer
stable
as $$
  select exists (
    select 1
    from room_members m
    join rooms r on r.id = m.room_id
    where m.room_id = rid
      and m.user_id = auth.uid()
      and (r.type <> 'channel' or m.role = 'admin')
  )
$$;

-- Create room (DM / group / channel)
create or replace function create_room(t text, n text default null, names text[] default '{}')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  rid bigint;
  ou uuid;
  nm text;
begin
  if t = 'dm' then
    if array_length(names, 1) <> 1 then
      raise exception 'dm needs exactly one username';
    end if;

    select id into ou from profiles where username = names[1];
    if ou is null then
      raise exception 'user not found';
    end if;

    -- existing DM?
    select r.id into rid
    from rooms r
    join room_members m1 on m1.room_id = r.id and m1.user_id = auth.uid()
    join room_members m2 on m2.room_id = r.id and m2.user_id = ou
    where r.type = 'dm'
    limit 1;

    if rid is not null then
      return rid;
    end if;

    insert into rooms (type) values ('dm') returning id into rid;
    insert into room_members values
      (rid, auth.uid(), 'member'),
      (rid, ou, 'member');
    return rid;
  end if;

  -- group or channel
  insert into rooms (type, name) values (t, n) returning id into rid;
  insert into room_members values (rid, auth.uid(), 'admin');

  foreach nm in array coalesce(names, '{}') loop
    insert into room_members
    select rid, id, 'member'
    from profiles
    where username = nm
    on conflict do nothing;
  end loop;

  return rid;
end;
$$;

-- Add member to group/channel (admin only)
create or replace function add_member(r bigint, nm text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from room_members m
    join rooms o on o.id = m.room_id
    where m.room_id = r
      and m.user_id = auth.uid()
      and m.role = 'admin'
      and o.type <> 'dm'
  ) then
    raise exception 'no';
  end if;

  insert into room_members
  select r, id, 'member'
  from profiles
  where username = nm
  on conflict do nothing;
end;
$$;

-- RLS for new tables
alter table profiles enable row level security;
alter table invites enable row level security;
alter table comments enable row level security;
alter table reactions enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table messages enable row level security;

create policy me_admin on admins for select using (id = auth.uid());

create policy r_profiles on profiles for select to authenticated using (true);

create policy w_invites on invites for all using (is_admin()) with check (is_admin());

create policy r_comments on comments for select using (true);
create policy i_comments on comments for insert with check (user_id = auth.uid());
create policy d_comments on comments for delete using (user_id = auth.uid() or is_admin());

create policy r_react on reactions for select using (true);
create policy i_react on reactions for insert with check (user_id = auth.uid());
create policy u_react on reactions for update using (user_id = auth.uid());
create policy d_react on reactions for delete using (user_id = auth.uid());

create policy r_rooms on rooms for select using (is_member(id));
create policy r_rm on room_members for select using (is_member(room_id));
create policy d_rm on room_members for delete using (user_id = auth.uid());

create policy r_msg on messages for select using (is_member(room_id));
create policy i_msg on messages for insert with check (user_id = auth.uid() and can_post(room_id));
create policy d_msg on messages for delete using (user_id = auth.uid());

-- Realtime for chat
alter publication supabase_realtime add table messages;
