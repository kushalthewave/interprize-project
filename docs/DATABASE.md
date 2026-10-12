# Connecting the results service

The game works with no database at all: accounts and rounds stay in the
browser, and the supervisor page says there is no service. Everything below is
optional, and turning it on changes four things:

- an account works on any computer, not just the one it was made on
- a finished round is stored where it cannot be edited afterwards
- a trainee can see their own history from any computer they log in on
- a supervisor can see who has trained and how they scored

It takes about ten minutes, and costs nothing on the free tier.

## 1. Make the project

1. Sign up at [supabase.com](https://supabase.com).
2. **New project**. Pick a region near your users (Singapore is the closest to
   Nepal), and set a database password. Keep that password; it is not used by
   the game, only by you if you ever open the database directly.
3. Wait for the project to finish building, about two minutes.

## 2. Create the tables

1. Open **SQL editor**, then **New query**.
2. Paste the whole of [`db/schema.sql`](../db/schema.sql) and run it.

That creates three tables (`profiles`, `sessions`, `session_hazards`), the two
views the supervisor page reads, and the policies that decide who can see what.

## 3. Create the supervisor account

1. **Authentication → Users → Add user**. Use the email the supervisor will
   sign in with, and set a password.
2. Back in the SQL editor, give that account the admin role:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

Until that line is run, the account is an ordinary trainee: the supervisor page
will load and show nothing, because the database refuses to return other
people's rows. That is the control working, not a bug.

## 4. Point the game at it

1. **Settings → API** in the Supabase dashboard. Copy the **Project URL** and
   the **anon public** key.
2. Copy `.env.example` to `.env.local` and fill both in:

   ```
   VITE_SUPABASE_URL=https://yourproject.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

3. Rebuild: `npm run build`.

For the published site, the same two values go in the repository's
**Settings → Secrets and variables → Actions → Variables**, and the deploy
workflow passes them to the build.

## What is safe to share, and what is not

| Value | Safe in the repository? |
|---|---|
| Project URL | Yes. It is in every request the page makes |
| `anon` public key | Yes. It is designed to ship inside a web page |
| `service_role` key | **No.** It bypasses every policy. The game never uses it |
| Database password | **No.** Not used by the game |

The anon key is public on purpose: it identifies the project, it does not grant
access. What a holder of that key can actually do is decided by the row level
security policies in `db/schema.sql`:

- a trainee can insert and read **only their own** rows
- an admin can read everything and **write nothing**
- **no one can update a stored round**, because no update policy exists for it
- a trainee cannot give themselves the admin role; the policy pins it

## Checking it works

1. Create an account in the game with a password.
2. Play a round and finish it.
3. In Supabase, **Table editor → sessions**: the round should be there.
4. Open `/admin.html`, sign in as the supervisor, and the account should be
   listed with one round against it.

## If the service is down

Nothing stops. The round is saved in the browser and queued, the game says so,
and the queue goes up on the next round, the next sign in, or when the browser
reports it is back online. Sign up and log in also fall back to the account
held on that computer, so training is never blocked by a network.
