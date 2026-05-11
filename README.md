This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin panel (`/admin`)

1. Run SQL in [`admin_migration.sql`](admin_migration.sql) on your Supabase project (after [`migration.sql`](migration.sql) if not already applied).
2. Run [`admin_approval_status_migration.sql`](admin_approval_status_migration.sql) so `admin_users.approval_status` exists (`pending_email_verify` → `awaiting_approval` → `active`).
3. **Self-registration:** open `/admin/register`, create a password, confirm the email OTP, then wait on the pending screen until a superuser activates the row.
4. **Superuser activation** (Supabase SQL editor):  
   `UPDATE public.admin_users SET approval_status = 'active' WHERE email = 'you@company.com';`  
   After that, sign in at `/admin/login` using **password** (then email OTP for 2FA), **magic link**, or **email code** as configured.

Legacy/manual onboarding still works: create the user in **Supabase Auth**, insert into `public.admin_users` (defaults to `active`; see **Admin → Settings**).

The [`src/proxy.ts`](src/proxy.ts) gate enforces session, `admin_users` membership, `approval_status`, and a fresh email-OTP step (12h) for protected `/admin` routes. Public paths include `/admin/login`, `/admin/register`, `/admin/auth/callback`, and related verification pages.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
