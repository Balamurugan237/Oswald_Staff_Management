-- ==========================================
-- 1. Database Extensions
-- ==========================================
-- Enable pg_cron for daily automated jobs
create extension if not exists pg_cron;

-- ==========================================
-- 2. Staff Profiles Table
-- ==========================================
create table public.staff (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null,
  department text not null check (department in ('Marketing', 'Frontend', 'Backend', 'Data Analyst', 'Data Entry', 'AI/ML Developer')),
  employment_type text not null check (employment_type in ('Full-time', 'Part-time', 'Intern', 'Contractor')),
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

-- Enable RLS on staff table
alter table public.staff enable row level security;

-- Policies for staff
create policy "Staff can view all profiles"
  on public.staff for select
  using (true);

create policy "Admins can manage profiles"
  on public.staff for all
  using (
    coalesce(auth.jwt() ->> 'role', '') = 'admin' 
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ==========================================
-- 3. Attendance Table
-- ==========================================
create table public.attendance (
  id uuid default gen_random_uuid() primary key,
  staff_id uuid references auth.users(id) on delete cascade not null,
  date date default current_date not null,
  status varchar(20) not null check (status in ('present', 'absent', 'late', 'half-day', 'leave')),
  check_in_time timestamptz,
  check_out_time timestamptz,
  total_hours numeric(5, 2),
  session_id text,
  recorded_by varchar(50) default 'system',
  created_at timestamptz default now() not null,
  unique (staff_id, date)
);

-- Enable RLS on attendance table
alter table public.attendance enable row level security;

-- Policies for attendance
create policy "Users can view own attendance"
  on public.attendance for select
  using (auth.uid() = staff_id);

create policy "Users can insert own checkins"
  on public.attendance for insert
  with check (auth.uid() = staff_id);

create policy "Users can update own checkouts"
  on public.attendance for update
  using (auth.uid() = staff_id);

create policy "Admins can manage all attendance"
  on public.attendance for all
  using (
    coalesce(auth.jwt() ->> 'role', '') = 'admin' 
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ==========================================
-- 4. Sign-in Automation (Trigger on Auth Users)
-- ==========================================
create or replace function public.handle_user_signin()
returns trigger as $$
declare
  v_department text;
  v_role text;
begin
  -- Ensure user exists in our public.staff profile table.
  -- If not, seed a default profile using user_metadata fields.
  insert into public.staff (id, name, email, role, department, employment_type)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'name', 'New Staff'),
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'role', 'Developer'),
    coalesce(NEW.raw_user_meta_data ->> 'department', 'Backend'),
    coalesce(NEW.raw_user_meta_data ->> 'employment_type', 'Full-time')
  )
  on conflict (id) do nothing;

  -- Auto check-in to attendance for today
  insert into public.attendance (staff_id, date, status, check_in_time, recorded_by)
  values (
    NEW.id, 
    current_date, 
    case 
      when now()::time > '09:30:00'::time then 'late'
      else 'present'
    end,
    now(), 
    'auth_trigger'
  )
  on conflict (staff_id, date) do update
  set check_in_time = coalesce(public.attendance.check_in_time, now()),
      status = case 
        when public.attendance.check_in_time is not null then public.attendance.status
        when now()::time > '09:30:00'::time then 'late'
        else 'present'
      end;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger fires after sign-in events update the last_sign_in_at field
create trigger on_auth_user_signin
  after update on auth.users
  for each row
  execute function public.handle_user_signin();

-- ==========================================
-- 5. Sign-out / Check-out RPC (Called by Client)
-- ==========================================
create or replace function public.handle_check_out(p_staff_id uuid)
returns void as $$
declare
  v_check_in timestamptz;
  v_check_out timestamptz;
  v_hours numeric(5, 2);
begin
  v_check_out := now();
  
  -- Get today's check-in
  select check_in_time into v_check_in
  from public.attendance
  where staff_id = p_staff_id and date = current_date;
  
  if v_check_in is not null then
    -- Calculate decimal hours worked
    v_hours := extract(epoch from (v_check_out - v_check_in)) / 3600.0;
  else
    v_hours := 0;
  end if;
  
  update public.attendance
  set check_out_time = v_check_out,
      total_hours = round(v_hours, 2)
  where staff_id = p_staff_id and date = current_date;
end;
$$ language plpgsql security definer;

-- ==========================================
-- 6. Cron Job (pg_cron at 11:59 PM to Mark Absentees)
-- ==========================================
create or replace function public.mark_absent_staff_daily()
returns void as $$
declare
  today_day_of_week integer;
begin
  today_day_of_week := extract(dow from current_date);
  
  -- Only execute on working days (Monday to Friday, i.e. 1 to 5)
  if today_day_of_week between 1 and 5 then
    insert into public.attendance (staff_id, date, status, recorded_by)
    select s.id, current_date, 'absent', 'system_cron'
    from public.staff s
    where s.is_active = true
      and not exists (
        select 1 
        from public.attendance a 
        where a.staff_id = s.id 
          and a.date = current_date
      );
  end if;
end;
$$ language plpgsql security definer;

-- Schedule job to run Monday through Friday at 11:59 PM (23:59)
select cron.schedule(
  'mark-absent-staff-daily-job',
  '59 23 * * 1-5',
  $$select public.mark_absent_staff_daily()$$
);
