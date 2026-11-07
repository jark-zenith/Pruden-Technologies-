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

A trial account with no incoming number cannot receive a real PSTN call or SMS. Trial messaging and calling are also restricted to verified destinations and eligible sender/region combinations. The current implementation deliberately restricts Ivy's outbound SMS tool to the founder's configured number. Customer messaging, AI-generated replies to callers, live media streams, recording/transcription and contact-consent management remain later phases. WhatsApp inbound sandbox capture is documented below; automated replies remain disabled.

## Verification checklist

1. Run `npm run build`.
2. Run `node --test server/ivy-twilio.test.mjs`.
3. Confirm `pruden_ivy_calls.direction` and `caller_number` exist.
4. Confirm `pruden_ivy_messages` exists with RLS enabled and no anon/authenticated grants.
5. After number provisioning, test inbound voice, keypad callback request, inbound SMS, owner SMS delivery callbacks, invalid signatures and duplicate inbound MessageSid handling.


## WhatsApp Sandbox (trial-only)

The inbound webhook accepts both standard E.164 SMS addresses and Twilio WhatsApp addresses (`whatsapp:+...`). WhatsApp messages are stored in `pruden_ivy_messages` with source `twilio_inbound_whatsapp`; Twilio signature validation remains mandatory. No automatic WhatsApp replies or outbound messages are enabled in this phase.

To activate the free-trial test path:

1. In Twilio Console, open **Try out WhatsApp** and activate the trial sandbox.
2. Join the sandbox from the founder's direct mobile/WhatsApp account using the QR code or the exact `join <sandbox code>` message shown in Console. Do not use or migrate the PRUDEN Technologies business WhatsApp number in this test phase.
3. In the sandbox's inbound-message settings, choose **Custom** and set the webhook to `https://pruden-command-secure.onrender.com/api/ivy/twilio/inbound-sms` using `POST`.
4. Save the setting, then send a test message from the joined owner device. Verify that it appears in the private `pruden_ivy_messages` table with source `twilio_inbound_whatsapp`.

The trial sandbox uses a shared Twilio sender and does not require purchasing a Twilio phone number or registering a business sender. Only joined participants can receive sandbox messages; trial units are limited, and the sandbox is for testing rather than production. Rejoin when the sandbox session expires.

The PRUDEN business WhatsApp number remains separate and untouched. The direct owner phone remains the only owner contact destination. Email remains the existing Ivy Gmail OAuth mailbox; the founder's contact email is a separate notification destination and is not substituted for Ivy's mailbox.
