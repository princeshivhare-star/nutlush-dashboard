# Nutlush — paid subscriber dashboard

A small, real Next.js app: add paid subscribers, tick off deliveries, and
give teammates access just by adding their email — no passwords to manage.

## 1. Create the database (Supabase — free tier is enough)

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's ready, open the **SQL Editor** and paste in the contents of
   `supabase/schema.sql`, then run it.
3. Before running, edit the line near the top:
   ```sql
   insert into team_members (email) values ('YOUR_EMAIL_HERE@example.com')
   ```
   Replace with your own email so you can sign in on day one. (You can also
   just add yourself after the fact from the SQL editor.)
4. Go to **Authentication → Providers** and confirm **Email** is enabled.
5. Go to **Authentication → URL Configuration** and, once you have your
   Vercel URL (step 3 below), add it to **Redirect URLs**, e.g.
   `https://your-app.vercel.app/auth/callback`. Add `http://localhost:3000/auth/callback`
   too if you want to test locally.
6. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key** — you'll need both next.

## 2. Push this project to GitHub

```bash
cd nutlush-app
git init
git add .
git commit -m "Nutlush paid subscriber dashboard"
```
Create a new repo on GitHub and push to it.

## 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import
   the GitHub repo you just pushed.
2. In **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon key>
   ```
3. Click **Deploy**. Vercel gives you a URL like `nutlush-crm.vercel.app`.
4. Go back to Supabase → **Authentication → URL Configuration** and add that
   real Vercel URL + `/auth/callback` to the redirect list (step 1.5 above),
   since you now know the final domain.

That's it — the dashboard is live at your Vercel URL.

## 4. Sign in and give access to your team

1. Open the Vercel URL, enter your email, and click the magic link sent to
   your inbox — you're in because you added yourself to `team_members`.
2. Inside the app, click **Team access** in the top right. Add a teammate's
   email there. They'll be able to sign in with their own magic link — no
   password to send them, nothing to share except telling them the URL.
3. To remove someone's access later, remove their email from that same
   panel (or delete the row directly in Supabase's table editor).

## How it works

- **Auth**: Supabase's passwordless email sign-in (magic links). Nobody
  types a password; anybody not on `team_members` sees a
  "not authorized" screen even if they do sign in.
- **Database**: two tables — `subscribers` and `deliveries` — plus
  `team_members` for the allowlist. Schema and row-level security policies
  are in `supabase/schema.sql`.
- **Data access**: the dashboard reads/writes Supabase directly from the
  browser using the anon key; row-level security (not app code) is what
  actually restricts access to team members only, so it's safe even though
  the key is public.
- **Hosting**: Vercel builds and serves the Next.js app; there's no server
  to manage.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```
Visit `http://localhost:3000`.
