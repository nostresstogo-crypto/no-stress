import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports so vitest hoists them correctly.
// ---------------------------------------------------------------------------

// Stub drizzle-orm query-builder helpers.  Our mock db ignores WHERE clauses
// entirely, so these only need to be callable without throwing.
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (a: unknown, b: unknown) => ({ type: "eq", a, b }),
  gt: (a: unknown, b: unknown) => ({ type: "gt", a, b }),
  gte: (a: unknown, b: unknown) => ({ type: "gte", a, b }),
  isNull: (a: unknown) => ({ type: "isNull", a }),
  lt: (a: unknown, b: unknown) => ({ type: "lt", a, b }),
  or: (...args: unknown[]) => ({ type: "or", args }),
  sql: Object.assign(
    (_strings: TemplateStringsArray, ..._vals: unknown[]) => ({ type: "sql" }),
    { placeholder: () => ({}) },
  ),
}));

// ---------------------------------------------------------------------------
// Spies exposed to tests — kept module-level so beforeEach can reset them.
// ---------------------------------------------------------------------------
const mockSendEmail = vi.fn();
const mockNotifyPush = vi.fn();
const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

// "../../email.js" resolves relative to this test file (src/lib/__tests__/) →
// src/email.ts, which matches the import in subscriptions.ts ("../email.js"
// relative to src/lib/).
vi.mock("../../email.js", () => ({
  sendSubscriptionExpiryWarningEmail: mockSendEmail,
}));

vi.mock("../pushNotifications.js", () => ({
  notifyPartnerSubscriptionExpiring: mockNotifyPush,
}));

vi.mock("../logger.js", () => ({ logger: mockLogger }));

// ---------------------------------------------------------------------------
// Mock @workspace/db
// ---------------------------------------------------------------------------

type PartnerRow = {
  id: number;
  email: string;
  contactName: string;
  businessName: string;
  status: string;
  subscriptionUntil: Date | null;
  subscriptionWarningEmailSentAt: Date | null;
  subscriptionWarningPushSentAt: Date | null;
};

// ---------------------------------------------------------------------------
// Per-test db state — reconfigured by helpers below.
// ---------------------------------------------------------------------------

/** Rows returned by the SELECT query (partners to notify). */
let _selectRows: PartnerRow[] = [];

/**
 * Controls what the email-channel atomic claim UPDATE … RETURNING resolves
 * with.  An empty array means the claim was NOT won (e.g. another instance
 * already claimed it today).
 */
let _emailClaimFn: () => Promise<{ id: number }[]> = () => Promise.resolve([]);

/**
 * Controls what the push-channel atomic claim UPDATE … RETURNING resolves with.
 */
let _pushClaimFn: () => Promise<{ id: number }[]> = () => Promise.resolve([]);

/**
 * Spy for the "reset" update (clearing a failed-channel timestamp).
 * Each test can assert on this to verify which timestamps were cleared.
 */
const _resetSpy = vi.fn();

/**
 * Build a Drizzle-compatible mock db for one test scenario.
 *
 * Claim calls are distinguished from reset calls by the keys in `.set(data)`:
 *   email claim  → `{ subscriptionWarningEmailSentAt: <Date> }`
 *   push  claim  → `{ subscriptionWarningPushSentAt:  <Date> }`
 *   reset        → one or both of the above fields set to null
 *
 * Using a factory function (rather than a fixed object) ensures a fresh
 * `makeMockDb()` result is returned each time the `db` getter is called,
 * keeping per-test state isolated.
 */
function makeMockDb() {
  return {
    select: () => ({
      from: (_t: unknown) => ({
        where: (_cond: unknown) => Promise.resolve(_selectRows),
      }),
    }),

    update: (_t: unknown) => ({
      set: (data: Record<string, unknown>) => ({
        where: (_cond: unknown) => {
          const isReset = Object.values(data).some((v) => v === null);

          if (isReset) {
            // Reset call — awaited directly (no .returning()).
            return _resetSpy(data);
          }

          // Claim call — identify the channel by which key is present.
          const isEmail = "subscriptionWarningEmailSentAt" in data;
          const claimFn = isEmail ? _emailClaimFn : _pushClaimFn;

          return {
            returning: (_shape: unknown) => claimFn(),
            then: (
              res: (v: undefined) => unknown,
              rej: ((e: unknown) => unknown) | undefined,
            ) => Promise.resolve(undefined).then(res, rej),
            catch: (rej: (e: unknown) => unknown) =>
              Promise.resolve(undefined).catch(rej),
          };
        },
      }),
    }),
  };
}

const mockPartnersTable = {
  id: "id",
  status: "status",
  subscriptionUntil: "subscriptionUntil",
  subscriptionWarningEmailSentAt: "subscriptionWarningEmailSentAt",
  subscriptionWarningPushSentAt: "subscriptionWarningPushSentAt",
  $inferInsert: {} as unknown,
};

vi.mock("@workspace/db", () => ({
  get db() {
    return makeMockDb();
  },
  get partnersTable() {
    return mockPartnersTable;
  },
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Configure the mock db for a simple fixed-result scenario. */
function configureMockDb(cfg: {
  selectRows: PartnerRow[];
  emailClaimRows: { id: number }[];
  pushClaimRows: { id: number }[];
}) {
  _selectRows = cfg.selectRows;
  _emailClaimFn = () => Promise.resolve(cfg.emailClaimRows);
  _pushClaimFn = () => Promise.resolve(cfg.pushClaimRows);
}

/** Build a partner row whose subscription expires in 3 days (safely inside the 1–7 day window). */
function makePartnerRow(overrides: Partial<PartnerRow> = {}): PartnerRow {
  return {
    id: 1,
    email: "partner@example.com",
    contactName: "Alice",
    businessName: "Acme Bar",
    status: "approved",
    subscriptionUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    subscriptionWarningEmailSentAt: null,
    subscriptionWarningPushSentAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import the function under test AFTER the mocks are declared.
// vitest hoists vi.mock() calls, so all mocks are in place before this runs.
// ---------------------------------------------------------------------------
const { checkExpiringSubscriptions } = await import("../subscriptions.js");

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  _resetSpy.mockResolvedValue(undefined);
  _selectRows = [];
  _emailClaimFn = () => Promise.resolve([]);
  _pushClaimFn = () => Promise.resolve([]);
});

describe("checkExpiringSubscriptions", () => {
  // ═════════════════════════════════════════════════════════════════════════
  // Single-run scenarios
  // ═════════════════════════════════════════════════════════════════════════

  it("sends email AND push when both channels are unclaimed; does not reset either timestamp", async () => {
    const partner = makePartnerRow();
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [{ id: partner.id }],
      pushClaimRows: [{ id: partner.id }],
    });

    mockSendEmail.mockResolvedValue(undefined);
    mockNotifyPush.mockResolvedValue(undefined);

    await checkExpiringSubscriptions();

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      partner.email,
      partner.contactName,
      partner.businessName,
      expect.any(Number),
      expect.any(Date),
    );
    expect(mockNotifyPush).toHaveBeenCalledOnce();
    expect(mockNotifyPush).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: partner.id }),
    );

    // No timestamp should have been cleared.
    expect(_resetSpy).not.toHaveBeenCalled();
  });

  it("resets only the email timestamp when email fails but push succeeds", async () => {
    const partner = makePartnerRow();
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [{ id: partner.id }],
      pushClaimRows: [{ id: partner.id }],
    });

    mockSendEmail.mockRejectedValue(new Error("SMTP error"));
    mockNotifyPush.mockResolvedValue(undefined);

    await checkExpiringSubscriptions();

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockNotifyPush).toHaveBeenCalledOnce();

    // Only the email timestamp should be reset.
    expect(_resetSpy).toHaveBeenCalledOnce();
    const resetData = _resetSpy.mock.calls[0][0];
    expect(resetData).toHaveProperty("subscriptionWarningEmailSentAt", null);
    expect(resetData).not.toHaveProperty("subscriptionWarningPushSentAt");
  });

  it("resets only the push timestamp when push fails but email succeeds", async () => {
    const partner = makePartnerRow();
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [{ id: partner.id }],
      pushClaimRows: [{ id: partner.id }],
    });

    mockSendEmail.mockResolvedValue(undefined);
    mockNotifyPush.mockRejectedValue(new Error("FCM error"));

    await checkExpiringSubscriptions();

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockNotifyPush).toHaveBeenCalledOnce();

    // Only the push timestamp should be reset.
    expect(_resetSpy).toHaveBeenCalledOnce();
    const resetData = _resetSpy.mock.calls[0][0];
    expect(resetData).toHaveProperty("subscriptionWarningPushSentAt", null);
    expect(resetData).not.toHaveProperty("subscriptionWarningEmailSentAt");
  });

  it("resets both timestamps when both email and push fail", async () => {
    const partner = makePartnerRow();
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [{ id: partner.id }],
      pushClaimRows: [{ id: partner.id }],
    });

    mockSendEmail.mockRejectedValue(new Error("SMTP down"));
    mockNotifyPush.mockRejectedValue(new Error("FCM down"));

    await checkExpiringSubscriptions();

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockNotifyPush).toHaveBeenCalledOnce();

    // Both timestamps must be cleared for the next run to retry both.
    expect(_resetSpy).toHaveBeenCalledOnce();
    const resetData = _resetSpy.mock.calls[0][0];
    expect(resetData).toHaveProperty("subscriptionWarningEmailSentAt", null);
    expect(resetData).toHaveProperty("subscriptionWarningPushSentAt", null);
  });

  it("skips both channels when a concurrent instance already claimed them", async () => {
    const partner = makePartnerRow();
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [], // another instance won the race
      pushClaimRows: [],
    });

    await checkExpiringSubscriptions();

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockNotifyPush).not.toHaveBeenCalled();
    expect(_resetSpy).not.toHaveBeenCalled();
  });

  it("sends only push when a concurrent instance already claimed the email channel", async () => {
    const partner = makePartnerRow();
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [],
      pushClaimRows: [{ id: partner.id }],
    });
    mockNotifyPush.mockResolvedValue(undefined);

    await checkExpiringSubscriptions();

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockNotifyPush).toHaveBeenCalledOnce();
    expect(_resetSpy).not.toHaveBeenCalled();
  });

  it("does nothing when no partners need notification today", async () => {
    configureMockDb({ selectRows: [], emailClaimRows: [], pushClaimRows: [] });

    await checkExpiringSubscriptions();

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockNotifyPush).not.toHaveBeenCalled();
    expect(_resetSpy).not.toHaveBeenCalled();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Two-run scenarios — prove that retry logic is actually correct end-to-end.
  //
  // Pattern: run checkExpiringSubscriptions() twice, each time with db state
  // that reflects what would be persisted after the previous run.
  // ═════════════════════════════════════════════════════════════════════════

  it("run 2 retries only the failed email channel; does not re-send the successful push", async () => {
    const partner = makePartnerRow();
    const now = new Date();

    // ── Run 1: email send fails, push send succeeds ──────────────────────
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [{ id: partner.id }],
      pushClaimRows: [{ id: partner.id }],
    });
    mockSendEmail.mockRejectedValueOnce(new Error("SMTP error"));
    mockNotifyPush.mockResolvedValueOnce(undefined);

    await checkExpiringSubscriptions();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockNotifyPush).toHaveBeenCalledTimes(1);
    // Email claim was released; push claim was kept.
    expect(_resetSpy).toHaveBeenCalledOnce();
    expect(_resetSpy.mock.calls[0][0]).toHaveProperty(
      "subscriptionWarningEmailSentAt",
      null,
    );

    vi.clearAllMocks();
    _resetSpy.mockResolvedValue(undefined);

    // ── Persisted state after run 1 ──────────────────────────────────────
    // emailSentAt = null (reset), pushSentAt = today (kept).
    const partnerAfterRun1 = makePartnerRow({
      subscriptionWarningEmailSentAt: null,
      subscriptionWarningPushSentAt: now,
    });

    // ── Run 2: only email is retried; push claim returns [] ──────────────
    // The push timestamp is set to today, so the push claim UPDATE returns
    // no rows (another "instance" already owns it — same semantics as
    // "already sent today").
    configureMockDb({
      selectRows: [partnerAfterRun1],
      emailClaimRows: [{ id: partner.id }], // email claim wins (was reset)
      pushClaimRows: [],                     // push already claimed today
    });
    mockSendEmail.mockResolvedValueOnce(undefined);

    await checkExpiringSubscriptions();

    // Email IS retried.
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    // Push is NOT re-sent.
    expect(mockNotifyPush).not.toHaveBeenCalled();
    // No reset needed — email succeeded this time.
    expect(_resetSpy).not.toHaveBeenCalled();
  });

  it("run 2 retries only the failed push channel; does not re-send the successful email", async () => {
    const partner = makePartnerRow();
    const now = new Date();

    // ── Run 1: email succeeds, push fails ───────────────────────────────
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [{ id: partner.id }],
      pushClaimRows: [{ id: partner.id }],
    });
    mockSendEmail.mockResolvedValueOnce(undefined);
    mockNotifyPush.mockRejectedValueOnce(new Error("FCM error"));

    await checkExpiringSubscriptions();

    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockNotifyPush).toHaveBeenCalledTimes(1);
    // Push claim was released; email claim was kept.
    expect(_resetSpy).toHaveBeenCalledOnce();
    expect(_resetSpy.mock.calls[0][0]).toHaveProperty(
      "subscriptionWarningPushSentAt",
      null,
    );

    vi.clearAllMocks();
    _resetSpy.mockResolvedValue(undefined);

    // ── Persisted state after run 1 ──────────────────────────────────────
    // emailSentAt = today (kept), pushSentAt = null (reset).
    const partnerAfterRun1 = makePartnerRow({
      subscriptionWarningEmailSentAt: now,
      subscriptionWarningPushSentAt: null,
    });

    // ── Run 2: only push is retried; email claim returns [] ──────────────
    configureMockDb({
      selectRows: [partnerAfterRun1],
      emailClaimRows: [],                   // email already claimed today
      pushClaimRows: [{ id: partner.id }],  // push claim wins (was reset)
    });
    mockNotifyPush.mockResolvedValueOnce(undefined);

    await checkExpiringSubscriptions();

    // Push IS retried.
    expect(mockNotifyPush).toHaveBeenCalledTimes(1);
    // Email is NOT re-sent.
    expect(mockSendEmail).not.toHaveBeenCalled();
    // No reset needed — push succeeded this time.
    expect(_resetSpy).not.toHaveBeenCalled();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Reset-UPDATE failure — recovery policy
  //
  // If the reset UPDATE fails (DB transient error), the claim timestamp is
  // NOT cleared.  The failure is logged immediately.  On the NEXT DAY the
  // stuck timestamp is older than todayStart, so the channel IS re-selected
  // and retried — no partner is permanently skipped.
  // ═════════════════════════════════════════════════════════════════════════

  it("retries the stuck channel the next day even if the timestamp reset UPDATE failed", async () => {
    const partner = makePartnerRow();

    // ── Run 1: email send fails AND reset UPDATE fails ───────────────────
    configureMockDb({
      selectRows: [partner],
      emailClaimRows: [{ id: partner.id }],
      pushClaimRows: [{ id: partner.id }],
    });
    mockSendEmail.mockRejectedValue(new Error("SMTP error"));
    mockNotifyPush.mockResolvedValue(undefined);
    _resetSpy.mockRejectedValue(new Error("DB connection lost"));

    // The scheduler must not crash — it catches the error and moves on.
    await expect(checkExpiringSubscriptions()).resolves.toBeUndefined();

    // The failure is logged — not completely silent.
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: partner.id }),
      expect.stringContaining("[subscription-expiry]"),
    );

    vi.clearAllMocks();
    _resetSpy.mockResolvedValue(undefined);

    // ── Next-day run ─────────────────────────────────────────────────────
    // The email claim timestamp is stuck at "yesterday" (the failed run set it
    // but could not clear it).  As far as tomorrow's scheduler is concerned,
    // that timestamp is BEFORE todayStart, so the partner IS selected again
    // and the email channel IS claimed and retried.
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000); // ~25 h ago
    const partnerNextDay = makePartnerRow({
      subscriptionUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      subscriptionWarningEmailSentAt: yesterday, // stuck claim from yesterday
      subscriptionWarningPushSentAt: yesterday,  // push also a day old
    });

    configureMockDb({
      selectRows: [partnerNextDay],
      emailClaimRows: [{ id: partner.id }], // claim succeeds (timestamp < todayStart)
      pushClaimRows: [{ id: partner.id }],  // push also retried (new day)
    });
    mockSendEmail.mockResolvedValue(undefined);
    mockNotifyPush.mockResolvedValue(undefined);

    await checkExpiringSubscriptions();

    // Both channels are delivered on the next day — no partner permanently skipped.
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockNotifyPush).toHaveBeenCalledOnce();
    expect(_resetSpy).not.toHaveBeenCalled();
  });
});
