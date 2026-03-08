-- Run this in Supabase SQL editor after supabase/app_state.sql.

alter table if exists public.invoices add column if not exists invoice_number text;
alter table if exists public.invoices add column if not exists guest_name text;
alter table if exists public.invoices add column if not exists taxable_amount numeric;
alter table if exists public.invoices add column if not exists gst_rate numeric;
alter table if exists public.invoices add column if not exists gst_amount numeric;

-- Keep invoice number unique per user when set.
drop index if exists invoices_user_invoice_number_idx;
create unique index if not exists invoices_user_invoice_number_unique
on public.invoices (user_id, invoice_number)
where invoice_number is not null;
