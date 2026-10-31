import test from "node:test";
import assert from "node:assert/strict";
import { getFinancialIntegrationStatus, sanitizeDarajaCallback } from "../server/financial-integrations.mjs";

test("Daraja remains disabled and sandbox-only without credentials", () => {
  const status = getFinancialIntegrationStatus({});
  assert.equal(status.daraja.environment, "sandbox");
  assert.equal(status.daraja.enabled, false);
  assert.equal(status.daraja.credentialsConfigured, false);
  assert.equal(status.daraja.stkPushEnabled, false);
  assert.equal(status.daraja.productionPaymentsAllowed, false);
  assert.equal(status.projectBridge.enabled, false);
});

test("STK callback is reduced to a safe reconciliation payload", () => {
  const result = sanitizeDarajaCallback("stk", {
    Body: { stkCallback: {
      MerchantRequestID: "merchant-1",
      CheckoutRequestID: "checkout-1",
      ResultCode: 0,
      ResultDesc: "The service request is processed successfully.",
      CallbackMetadata: { Item: [
        { Name: "Amount", Value: 250 },
        { Name: "MpesaReceiptNumber", Value: "QAB12CD34" },
        { Name: "PhoneNumber", Value: 254712345678 }
      ] }
    } }
  });
  assert.equal(result.eventId, "checkout-1");
  assert.equal(result.safePayload.amount, 250);
  assert.equal(result.safePayload.mpesaReceiptNumber, "QAB12CD34");
  assert.equal(result.safePayload.phone, "••••5678");
  assert.equal("PhoneNumber" in result.safePayload, false);
});

test("C2B callback masks phone numbers and keeps transaction references", () => {
  const result = sanitizeDarajaCallback("c2b", {
    TransID: "QAB12CD34",
    TransAmount: "500.00",
    BillRefNumber: "PICHahub-ORDER-1",
    MSISDN: "254712345678",
    FirstName: "Customer"
  });
  assert.equal(result.eventId, "QAB12CD34");
  assert.equal(result.safePayload.amount, 500);
  assert.equal(result.safePayload.billReference, "PICHahub-ORDER-1");
  assert.equal(result.safePayload.phone, "••••5678");
  assert.equal("FirstName" in result.safePayload, false);
});
