# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Payment Gateway Setup (Razorpay + Supabase Edge Functions)

This project includes Razorpay integration for invoice payments.

### 1) Frontend env

Set these in your `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_FUNCTIONS_URL=https://<project-ref>.supabase.co/functions/v1
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

If `VITE_SUPABASE_FUNCTIONS_URL` is omitted, the app infers it as `${VITE_SUPABASE_URL}/functions/v1`.

### 2) Edge function secrets

Set secrets in Supabase:

```sh
supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxx
supabase secrets set RAZORPAY_KEY_SECRET=xxxxxxxx
```

### 3) Deploy functions

```sh
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy send-notification-email
supabase functions deploy provision-admin-user
supabase functions deploy validate-admin-access
supabase functions deploy complete-admin-password-reset
supabase functions deploy reset-admin-password
```

### 3.1) Email notification secrets (Resend)

Set email provider secrets in Supabase:

```sh
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set NOTIFY_FROM_EMAIL="Hotel Notifications <onboarding@resend.dev>"
```

`NOTIFY_FROM_EMAIL` is optional; if omitted, a default Resend onboarding sender is used.

### 4) Billing behavior

- If Razorpay config is present, the **Pay Online** button opens Razorpay Checkout and verifies signature server-side.
- If Razorpay config is missing, billing falls back to **Pay UPI** deeplink using UPI VPA from settings.
- Booking and billing events can send notification emails to the property email configured in settings, based on notification toggles.

## Superadmin Quick Setup

1) Copy `.env.example` to `.env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

2) In Supabase SQL Editor, run in this order:

- `supabase/app_state.sql`
- `supabase/hotel_entities.sql`
- `supabase/billing_enhancements.sql`
- `supabase/superadmin.sql`
- `supabase/superadmin_users_settings.sql`
- `supabase/superadmin_permissions_matrix.sql`
- `supabase/superadmin_bootstrap.sql`
- `supabase/superadmin_admin_provisioning.sql`

3) In Supabase Auth Users, ensure user exists:

- Email: `superadmin@room.com`
- Password: `Super@123`

4) Start app:

```sh
npm run dev
```

5) Login URL:

- `http://localhost:8080/superadmin/login`
