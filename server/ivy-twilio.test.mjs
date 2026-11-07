import test from "node:test";
import assert from "node:assert/strict";
import { ivyTwilioCapabilityStatus } from "./ivy-twilio.mjs";

test("Twilio capability status never reports live AI voice as implemented", () => {
  const status = ivyTwilioCapabilityStatus();
  assert.equal(status.liveConversation, "not_implemented");
  assert.equal(typeof status.inboundVoice, "string");
  assert.equal(typeof status.inboundSms, "string");
  assert.equal(typeof status.outboundSms, "string");
});

test("Twilio capability status reports setup required when sender number is absent", () => {
  const previous = process.env.TWILIO_PHONE_NUMBER;
  delete process.env.TWILIO_PHONE_NUMBER;
  try {
    const status = ivyTwilioCapabilityStatus();
    assert.equal(status.status, "setup_required");
    assert.equal(status.outboundCalls, "not_available");
    assert.equal(status.outboundSms, "setup_required");
  } finally {
    if (previous !== undefined) process.env.TWILIO_PHONE_NUMBER = previous;
  }
});
