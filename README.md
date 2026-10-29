# Hutao Bot Web — Account + Community Update

Premium dark web chat with web-based account registration/login, per-browser IndexedDB chat history, account profile, and a shared community room backed by Supabase SQL.

## Architecture

- **Supabase SQL**: user accounts, password hashes, server-side sessions, EXP/game data, and shared community messages.
- **IndexedDB**: private bot-chat history and the active session token in each browser. Clearing browser data can remove local chat history; the server session itself expires after 30 days or can be revoked with logout.
- **Community**: shared messages are persisted in Supabase and refreshed from the server. This is shared between authenticated users, unlike the private bot conversation history.
- **Images**: community image attachments are stored as data URLs in the SQL message row for this starter implementation. For production scale, move image bytes to a Supabase Storage bucket and save only the object URL in SQL.
- **Secrets**: the Supabase service-role key is server-only. Never expose it in `public/`.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor. This creates account/session/game tables and the shared community message table.
3. Set Railway/server environment variables:
   - `SUPABASE_URL=https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>`
4. Deploy the Node server on Railway or another Node host. The Express server must remain available for auth and community API calls. Vercel static-only hosting will not run this server without a separate backend deployment and API URL configuration.
5. Open the site; web login/register is available from the account panel. Users can register/login using the form. `.daftar` and `.login` in chat open the web form instead.

## Run locally

```sh
npm install
npm start
```

## Notes

- Usernames: 3–24 characters, letters/numbers/underscore.
- Passwords: at least 8 characters; stored using scrypt hashes.
- Sessions: random opaque tokens, stored hashed in SQL, 30-day expiry.
- Private chat history is local to the browser's IndexedDB. Community messages are shared server-side.
- This starter version uses polling for community updates; realtime Supabase subscriptions can be added later.


## V6.1 Community workspace update

- Authentication form is surfaced immediately for users without a valid session; closing the gate is disabled until login/register succeeds.
- Account profile now has its own profile page with role, level, EXP progress, and logout.
- Community includes shared rooms: `general`, `bot-talk`, and `media`. Messages are filtered by room on the server.
- Run the updated `supabase/schema.sql` after deploying; it includes a safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS room` migration for existing V6 databases.
- Private bot conversation remains stored in IndexedDB per browser; shared community messages live in Supabase SQL.
