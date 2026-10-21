# Ivy Gmail integration — deployment and verification

This integration is part of PRUDEN Command (`jark-zenith/Pruden-Technologies-`). It is not active until the server configuration, SQL migration, Google OAuth consent, and mailbox tests are complete.

## Capabilities and guardrails

- OAuth is restricted to the single mailbox `ivyassistantai@gmail.com`; the callback checks Google's returned account identity before saving tokens.
- Ivy can search and read messages, save drafts, and organize mail using Gmail labels/archive controls.
- Sending is a separate operation: the founder must save a draft, type the exact phrase `SEND EMAIL`, and approve a browser confirmation. A draft save never sends mail.
- Refresh/access tokens are encrypted with AES-256-GCM before they are stored in the private Supabase table. The encryption key and service-role key must never be exposed to browser variables or committed to Git.
- OAuth scope includes Gmail modify and send. Google may require OAuth consent-screen configuration and verification depending on the app's publishing status and users.

## 1. Apply the database migration

Run `supabase/migrations/202610210001_ivy_gmail_tokens.sql` against the same Supabase project used by PRUDEN Command. The table is protected by RLS and grants access only to the service role. Do not grant `anon` or `authenticated` access.

## 2. Configure Google OAuth

In Google Cloud Console:
1. Select or create the project that will own the OAuth client.
2. Enable the Gmail API.
3. Configure the OAuth consent screen and add the intended test user while the app is in testing.
4. Create a **Web application** OAuth client.
5. Add this exact authorized redirect URI (must match the deployed service domain):
   `https://pruden-command-secure.onrender.com/api/ivy/gmail/oauth/callback`
6. Add the client ID and secret only to the private Render service environment.

Required server environment variables:

- `GOOGLE_CLIENT_ID` — Web OAuth client ID.
- `GOOGLE_CLIENT_SECRET` — OAuth client secret.
- `GOOGLE_REDIRECT_URI` — exact callback URL above (or the actual canonical deployment URL if it differs).
- `SUPABASE_URL` — project URL; `VITE_SUPABASE_URL` is accepted as a fallback.
- `SUPABASE_SERVICE_ROLE_KEY` — private service-role key; never use a publishable/anon key here.
- `IVY_TOKEN_ENCRYPTION_KEY` — a random 32-byte key, encoded as 64 hexadecimal characters or base64.

Generate an encryption key locally with Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Store it in Render's private environment settings. Do not paste it into chat or commit it.

## 3. Connect Ivy

After deploying the code and applying the migration, sign in to PRUDEN Command, open **Reports & Settings → Ivy settings → Ivy's Gmail workspace**, and select **Connect Ivy's Gmail**. Sign in as exactly `ivyassistantai@gmail.com`. If Google does not return a refresh token, revoke the existing app grant in the Google Account security page and reconnect with consent.

## 4. Verify before relying on it

- Status endpoint reports `connected: true` only after a refresh token is stored for Ivy's exact mailbox.
- Search an email using a query such as `in:inbox newer_than:30d`.
- Open a message and verify the sender, subject, and body.
- Save a draft to a controlled test address; verify it appears in Gmail Drafts and has not been sent.
- Send only after reviewing the draft, typing `SEND EMAIL`, and approving the browser confirmation. Verify it appears in Sent.
- Test wrong Google account, OAuth cancellation, missing configuration, expired access token refresh, and disconnected/revoked credentials.
- Review Render logs and Supabase table permissions. Never log token values or email bodies.

Do not label the integration production-ready until the deployed service passes these tests.
