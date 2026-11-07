# Ivy + Twilio communications (trial-first)

## Scope in this phase

- Preserve the existing owner-only outbound voice call flow.
- Add an inbound voice IVR entry point with a short keypad menu.
- Add inbound SMS capture with Twilio signature verification and server-only storage.
- Add owner-only outbound SMS through Ivy's explicit tool call.
- Persist SMS and inbound-call activity in Supabase.
- Do not purchase numbers, upgrade the Twilio account, or trigger test calls/SMS automatically.

## Required Render environment

The existing private service already contains the account credentials and owner destination. Configure the sender only after a Voice- and SMS-capable number has been provisioned:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER` (E.164)
- `IVY_OWNER_PHONE` (E.164)
- `TWILIO_VOICE_WEBHOOK_SECRET` (32+ random characters)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never place Twilio or Supabase service credentials in `VITE_*` variables.

## Twilio number webhook configuration

After a suitable number exists, configure:

- Voice URL: `https://pruden-command-secure.onrender.com/api/ivy/twilio/inbound-voice`
- Voice method: `POST`
- Messaging URL: `https://pruden-command-secure.onrender.com/api/ivy/twilio/inbound-sms`
- Messaging method: `POST`

Keep Twilio request-signature validation enabled. Do not add query parameters or URL redirects in front of these endpoints; Twilio signs the exact request URL.

## Trial limitations and current boundary

A trial account with no incoming number cannot receive a real PSTN call or SMS. Trial messaging and calling are also restricted to verified destinations and eligible sender/region combinations. The current implementation deliberately restricts Ivy's outbound SMS tool to the founder's configured number. Customer messaging, AI-generated replies to callers, WhatsApp, live media streams, recording/transcription and contact-consent management are later phases.

## Verification checklist

1. Run `npm run build`.
2. Run `node --test server/ivy-twilio.test.mjs`.
3. Confirm `pruden_ivy_calls.direction` and `caller_number` exist.
4. Confirm `pruden_ivy_messages` exists with RLS enabled and no anon/authenticated grants.
5. After number provisioning, test inbound voice, keypad callback request, inbound SMS, owner SMS delivery callbacks, invalid signatures and duplicate inbound MessageSid handling.
