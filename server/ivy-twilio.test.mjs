import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { ivyTwilioCapabilityStatus, registerIvyTwilioWebhookRoutes } from "./ivy-twilio.mjs";

function routeHarness() {
  const routes = new Map();
  registerIvyTwilioWebhookRoutes({ post: (path, handler) => routes.set(path, handler) });
  return routes;
}
function responseHarness() {
  return {
    code: 200, contentType: "", body: "",
    status(code) { this.code = code; return this; },
    type(contentType) { this.contentType = contentType; return this; },
    send(body) { this.body = body; return this; },
    end() { return this; }
  };
}
function signedRequest(path, body, token) {
  const host = "pruden-command-secure.onrender.com";
  const url = "https://" + host + path;
  let data = url;
  for (const key of Object.keys(body).sort()) data += key + String(body[key] ?? "");
  const signature = createHmac("sha1", token).update(data, "utf8").digest("base64");
  return {
    protocol: "https", originalUrl: path, body, query: {},
    get(name) { return name === "host" ? host : name.toLowerCase() === "x-twilio-signature" ? signature : ""; }
  };
}

test("Twilio capability status never reports live AI voice as implemented", () => {
  const status = ivyTwilioCapabilityStatus();
  assert.equal(status.liveConversation, "not_implemented");
  assert.equal(typeof status.inboundVoice, "string");
  assert.equal(typeof status.inboundSms, "string");
  assert.equal(typeof status.outboundSms, "string");
  assert.equal(status.whatsapp.provider, "Twilio WhatsApp Sandbox");
  assert.equal(status.whatsapp.businessNumberUntouched, true);
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

test("inbound voice rejects requests without a valid Twilio signature", async () => {
  const previous = process.env.TWILIO_AUTH_TOKEN;
  process.env.TWILIO_AUTH_TOKEN = "unit-test-token";
  try {
    const path = "/api/ivy/twilio/inbound-voice";
    const req = {
      protocol: "https",
      originalUrl: path,
      body: { CallSid: "CA" + "a".repeat(32), From: "+254700000000", To: "+15005550006" },
      query: {},
      get(name) { return name === "host" ? "pruden-command-secure.onrender.com" : ""; }
    };
    const res = responseHarness();
    await routeHarness().get(path)(req, res);
    assert.equal(res.code, 403);
  } finally {
    if (previous === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = previous;
  }
});

test("inbound voice validates Twilio signature before validating the call payload", async () => {
  const previous = process.env.TWILIO_AUTH_TOKEN;
  process.env.TWILIO_AUTH_TOKEN = "unit-test-token";
  try {
    const path = "/api/ivy/twilio/inbound-voice";
    const req = signedRequest(path, { CallSid: "invalid", From: "+254700000000", To: "+15005550006" }, "unit-test-token");
    const res = responseHarness();
    await routeHarness().get(path)(req, res);
    assert.equal(res.code, 400);
  } finally {
    if (previous === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = previous;
  }
});

test("inbound SMS rejects invalid Twilio signatures", async () => {
  const previous = process.env.TWILIO_AUTH_TOKEN;
  process.env.TWILIO_AUTH_TOKEN = "unit-test-token";
  try {
    const path = "/api/ivy/twilio/inbound-sms";
    const req = {
      protocol: "https", originalUrl: path,
      body: { MessageSid: "SM" + "a".repeat(32), From: "+254700000000", To: "+15005550006", Body: "hello" },
      query: {},
      get(name) { return name === "host" ? "pruden-command-secure.onrender.com" : ""; }
    };
    const res = responseHarness();
    await routeHarness().get(path)(req, res);
    assert.equal(res.code, 403);
  } finally {
    if (previous === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = previous;
  }
});


test("inbound WhatsApp rejects requests without a valid Twilio signature", async () => {
  const previous = process.env.TWILIO_AUTH_TOKEN;
  process.env.TWILIO_AUTH_TOKEN = "unit-test-token";
  try {
    const path = "/api/ivy/twilio/inbound-sms";
    const req = { protocol: "https", originalUrl: path, body: { MessageSid: "SM" + "a".repeat(32), From: "whatsapp:+254180574470", To: "whatsapp:+14155238886", Body: "Hello Ivy" }, query: {}, get(name) { return name === "host" ? "pruden-command-secure.onrender.com" : ""; } };
    const res = responseHarness();
    await routeHarness().get(path)(req, res);
    assert.equal(res.code, 403);
  } finally {
    if (previous === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = previous;
  }
});
