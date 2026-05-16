const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

loadDotEnv();

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const REGISTER_FILE = path.join(ROOT, "business-register.json");
const ADMIN_TOKEN = hasRealSecret(process.env.ADMIN_TOKEN, "replace-with-long-random-token") ? process.env.ADMIN_TOKEN : "";
const LICENSE_SECRET = firstRealSecret([
  [process.env.LICENSE_SECRET, "replace-with-long-random-license-secret"],
  [process.env.STRIPE_WEBHOOK_SECRET, "whsec_replace_me"],
  [ADMIN_TOKEN, "replace-with-long-random-token"]
]) || "disputedesk-local-license-v1";
const STORAGE_ENCRYPTION_SECRET = process.env.DATA_ENCRYPTION_KEY || "";
const ENCRYPTED_RECORD_MARKER = "disputedesk.encrypted.v1";
const CORE_PLAN_PRICE = 99;
const LEGACY_GROWTH_PAYMENT_LINK = "https://buy.stripe.com/fZuaEZ8Zc4zC4fI8EJgw001";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    const name = key.trim();
    if (!name || process.env[name] !== undefined) continue;
    let value = rest.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[name] = value;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/api/leads") {
      const payload = await readJson(request);
      const lead = sanitizeLead(payload);
      appendRecord("leads.jsonl", lead);
      sendMetaEvent("Lead", {
        email: lead.email,
        eventSourceUrl: process.env.PUBLIC_SITE_URL || ""
      }).catch(error => console.error("Meta CAPI error", error.message));
      return sendJson(response, { ok: true });
    }

    if (request.method === "GET" && url.pathname === "/api/leads") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      return sendJson(response, { ok: true, leads: readRecords("leads.jsonl") });
    }

    if (request.method === "POST" && url.pathname === "/api/feedback") {
      const payload = await readJson(request);
      appendRecord("feedback.jsonl", sanitizeFeedback(payload));
      return sendJson(response, { ok: true });
    }

    if (request.method === "GET" && url.pathname === "/api/feedback") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      return sendJson(response, { ok: true, feedback: readRecords("feedback.jsonl") });
    }

    if (request.method === "GET" && url.pathname === "/api/customers") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      return sendJson(response, { ok: true, customers: readRecords("customers.jsonl") });
    }

    if (request.method === "GET" && url.pathname === "/api/license/status") {
      return sendJson(response, await buildLicenseStatus(request, Object.fromEntries(url.searchParams.entries())));
    }

    if (request.method === "POST" && url.pathname === "/api/license/verify") {
      const payload = await readJson(request).catch(() => ({}));
      return sendJson(response, await buildLicenseStatus(request, payload));
    }

    if (request.method === "POST" && url.pathname === "/api/license/claim") {
      const payload = await readJson(request).catch(() => ({}));
      const email = normalizeEmail(payload.email);
      const checkoutSessionId = cleanText(payload.checkoutSessionId, 220);
      const record = await findOrFetchLicenseRecord(email, checkoutSessionId);
      if (!record) {
        return sendJson(response, {
          ok: false,
          active: false,
          error: "No paid live Stripe checkout record matched that email and session."
        }, 404);
      }
      return sendJson(response, {
        ok: true,
        active: true,
        token: record.token,
        customerEmail: record.email,
        plan: record.plan,
        livemode: record.livemode
      });
    }

    if (request.method === "GET" && url.pathname === "/api/account/status") {
      return sendJson(response, await buildAccountStatus(request, Object.fromEntries(url.searchParams.entries())));
    }

    if (request.method === "POST" && url.pathname === "/api/account/register") {
      const payload = await readJson(request).catch(() => ({}));
      const account = await buildAccountStatus(request, payload);
      return sendJson(response, account, account.active ? 200 : 401);
    }

    if (request.method === "GET" && url.pathname === "/api/workspace") {
      return sendJson(response, await getCustomerWorkspace(request, Object.fromEntries(url.searchParams.entries())));
    }

    if (request.method === "POST" && url.pathname === "/api/workspace") {
      const payload = await readJson(request).catch(() => ({}));
      const workspace = await saveCustomerWorkspace(request, payload);
      return sendJson(response, workspace, workspace.ok ? 200 : 401);
    }

    if (request.method === "GET" && url.pathname === "/api/income-evidence") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      return sendJson(response, buildIncomeEvidence());
    }

    if (request.method === "GET" && url.pathname === "/api/profit-report") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      return sendJson(response, buildProfitReport());
    }

    if (request.method === "POST" && url.pathname === "/api/operator/run") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      const payload = await readJson(request).catch(() => ({}));
      const run = buildOperatorRun(payload);
      appendRecord("operator-runs.jsonl", run);
      for (const action of run.actions) appendRecord("operator-actions.jsonl", action);
      return sendJson(response, { ok: true, run });
    }

    if (request.method === "GET" && url.pathname === "/api/operator/actions") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      return sendJson(response, { ok: true, actions: readRecords("operator-actions.jsonl") });
    }

    if (request.method === "GET" && url.pathname === "/api/status") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      return sendJson(response, buildBusinessStatus());
    }

    if (request.method === "GET" && url.pathname === "/api/business-register") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      return sendJson(response, { ok: true, register: readBusinessRegister() });
    }

    if (request.method === "POST" && url.pathname === "/api/business-register") {
      if (!authorizeAdmin(request)) return sendJson(response, { ok: false, error: "Unauthorized" }, 401);
      const payload = await readJson(request);
      const register = buildBusinessRegister(payload.settings || payload);
      writeJson(REGISTER_FILE, register);
      return sendJson(response, { ok: true, register });
    }

    if (request.method === "POST" && url.pathname === "/api/stripe/webhook") {
      const raw = await readRaw(request);
      if (!verifyStripeSignature(raw, request.headers["stripe-signature"], request)) {
        return sendJson(response, { ok: false, error: "Invalid Stripe signature" }, 400);
      }
      const event = JSON.parse(raw.toString("utf8"));
      appendRecord("stripe-events.jsonl", {
        id: event.id,
        type: event.type,
        created: event.created,
        livemode: event.livemode,
        receivedAt: new Date().toISOString()
      });

      if (event.type === "checkout.session.completed") {
        const customerEmail = event.data?.object?.customer_details?.email || event.data?.object?.customer_email || "";
        appendRecord("customers.jsonl", {
          sourceEventId: event.id,
          checkoutSessionId: event.data?.object?.id,
          customerEmail,
          amountTotal: event.data?.object?.amount_total,
          currency: event.data?.object?.currency,
          paymentStatus: event.data?.object?.payment_status,
          livemode: Boolean(event.livemode),
          createdAt: new Date().toISOString()
        });
        sendMetaEvent("Purchase", {
          email: customerEmail,
          value: Number(event.data?.object?.amount_total || 0) / 100,
          currency: event.data?.object?.currency || "usd",
          eventSourceUrl: process.env.PUBLIC_SITE_URL || ""
        }).catch(error => console.error("Meta CAPI error", error.message));
      }

      return sendJson(response, { received: true });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, { ok: true, version: "0.1.0", service: "disputedesk" });
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    return sendJson(response, { ok: false, error: "Server error" }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`DisputeDesk running at http://${HOST}:${PORT}`);
});

function serveStatic(urlPath, response) {
  const safePath = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath === "/" ? "index.html" : safePath);
  if (!filePath.startsWith(ROOT)) return notFound(response);
  fs.readFile(filePath, (error, content) => {
    if (error) return notFound(response);
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}

function notFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
}

function sendJson(response, body, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function appendRecord(filename, record) {
  fs.appendFileSync(path.join(DATA_DIR, filename), `${JSON.stringify(encodeStoredRecord(record))}\n`);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readRecords(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(line => decodeStoredRecord(JSON.parse(line)));
}

function encodeStoredRecord(record) {
  const key = getStorageEncryptionKey();
  if (!key) {
    throw new Error("DATA_ENCRYPTION_KEY is required before storing server records.");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(record), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    _disputedesk: ENCRYPTED_RECORD_MARKER,
    alg: "AES-256-GCM",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: encrypted.toString("base64url")
  };
}

function decodeStoredRecord(record) {
  if (!record || record._disputedesk !== ENCRYPTED_RECORD_MARKER) return record;
  const key = getStorageEncryptionKey();
  if (!key) {
    throw new Error("DATA_ENCRYPTION_KEY is required before reading encrypted server records.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(record.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(record.tag, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(record.data, "base64url")),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

function getStorageEncryptionKey() {
  if (!hasRealSecret(STORAGE_ENCRYPTION_SECRET, "replace-with-long-random-data-encryption-key")) return null;
  return crypto.createHash("sha256").update(`disputedesk-storage:${STORAGE_ENCRYPTION_SECRET}`).digest();
}

function readBusinessRegister() {
  if (!fs.existsSync(REGISTER_FILE)) return {};
  return JSON.parse(fs.readFileSync(REGISTER_FILE, "utf8"));
}

function authorizeAdmin(request) {
  if (request.headers["x-admin-token"] === ADMIN_TOKEN) return true;
  return isLocalRequest(request);
}

function isLocalRequest(request) {
  const remote = request.socket?.remoteAddress || "";
  const host = String(request.headers.host || "");
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote) ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("localhost:");
}

async function buildLicenseStatus(request, input = {}) {
  const operatorLocal = isLocalRequest(request);
  const email = normalizeEmail(input.email || input.customerEmail);
  const credential = cleanText(input.token || input.licenseToken || input.checkoutSessionId || input.sessionId, 220);
  const record = credential ? await findOrFetchLicenseRecord(email, credential) : null;
  const active = Boolean(operatorLocal || record);
  const liveLicenseCount = getLicenseRecords().filter(item => item.livemode === true).length;

  return {
    ok: true,
    gatingEnabled: true,
    active,
    operatorLocal,
    customerEmail: record?.email || (operatorLocal ? "local-operator" : ""),
    plan: record?.plan || (operatorLocal ? "operator" : ""),
    liveLicenseCount,
    licenseSecretConfigured: hasRealSecret(process.env.LICENSE_SECRET, "replace-with-long-random-license-secret") || hasRealSecret(process.env.STRIPE_WEBHOOK_SECRET, "whsec_replace_me") || Boolean(ADMIN_TOKEN),
    checkedAt: new Date().toISOString(),
    message: active
      ? operatorLocal
        ? "Local operator mode is unlocked. Public customer access still requires paid Stripe license verification."
        : "Paid Stripe license verified."
      : "Paid access required. Subscribe with Stripe, then verify with the checkout email and access token or session ID."
  };
}

async function buildAccountStatus(request, input = {}) {
  const access = await resolveWorkspaceAccess(request, input);
  if (!access.ok) {
    return {
      ok: true,
      active: false,
      workspaceReady: false,
      error: access.error,
      message: "Paid access required before creating a customer workspace."
    };
  }
  const workspace = getLatestWorkspace(access.workspaceId);
  return {
    ok: true,
    active: true,
    workspaceReady: true,
    account: publicAccount(access),
    workspace: publicWorkspaceSummary(workspace),
    token: access.token || "",
    message: access.operatorLocal
      ? "Local operator workspace is available on this computer."
      : "Paid customer workspace is available."
  };
}

async function getCustomerWorkspace(request, input = {}) {
  const access = await resolveWorkspaceAccess(request, input);
  if (!access.ok) {
    return {
      ok: false,
      active: false,
      error: access.error || "Paid access required."
    };
  }
  const workspace = getLatestWorkspace(access.workspaceId);
  return {
    ok: true,
    active: true,
    account: publicAccount(access),
    workspace: workspace
      ? publicWorkspace(workspace)
      : {
          disputes: [],
          recordCount: 0,
          updatedAt: "",
          empty: true
        }
  };
}

async function saveCustomerWorkspace(request, input = {}) {
  const access = await resolveWorkspaceAccess(request, input);
  if (!access.ok) {
    return {
      ok: false,
      active: false,
      error: access.error || "Paid access required."
    };
  }

  const disputes = sanitizeDisputes(input.disputes || input.workspace?.disputes || []);
  const record = {
    workspaceId: access.workspaceId,
    customerEmail: access.email,
    plan: access.plan,
    livemode: Boolean(access.livemode),
    operatorLocal: Boolean(access.operatorLocal),
    recordCount: disputes.length,
    disputes,
    updatedAt: new Date().toISOString()
  };
  appendRecord("workspaces.jsonl", record);
  return {
    ok: true,
    active: true,
    account: publicAccount(access),
    workspace: publicWorkspace(record),
    message: "Workspace saved to encrypted server storage."
  };
}

async function resolveWorkspaceAccess(request, input = {}) {
  const operatorLocal = isLocalRequest(request);
  const email = normalizeEmail(input.email || input.customerEmail || request.headers["x-customer-email"]);
  const credential = cleanText(
    input.token ||
    input.licenseToken ||
    input.checkoutSessionId ||
    input.sessionId ||
    request.headers["x-license-token"] ||
    bearerToken(request),
    220
  );

  if (operatorLocal && !credential) {
    return {
      ok: true,
      operatorLocal: true,
      email: "local-operator",
      plan: "operator",
      livemode: false,
      token: "",
      workspaceId: makeWorkspaceId("local-operator")
    };
  }

  const record = await findOrFetchLicenseRecord(email, credential);
  if (!record) {
    return {
      ok: false,
      error: "No paid live Stripe checkout record matched that email and credential."
    };
  }

  return {
    ok: true,
    operatorLocal: false,
    email: record.email,
    plan: record.plan,
    livemode: Boolean(record.livemode),
    token: record.token,
    workspaceId: makeWorkspaceId(record.email)
  };
}

function bearerToken(request) {
  const header = String(request.headers.authorization || "");
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function makeWorkspaceId(email) {
  return crypto.createHmac("sha256", LICENSE_SECRET)
    .update(`workspace:${normalizeEmail(email)}`)
    .digest("hex")
    .slice(0, 32);
}

function getLatestWorkspace(workspaceId) {
  return readRecords("workspaces.jsonl")
    .filter(record => record.workspaceId === workspaceId)
    .at(-1) || null;
}

function publicAccount(access) {
  return {
    customerEmail: access.email,
    plan: access.plan,
    livemode: Boolean(access.livemode),
    operatorLocal: Boolean(access.operatorLocal),
    workspaceId: access.workspaceId
  };
}

function publicWorkspaceSummary(workspace) {
  return workspace
    ? {
        recordCount: Number(workspace.recordCount || workspace.disputes?.length || 0),
        updatedAt: workspace.updatedAt || "",
        empty: false
      }
    : {
        recordCount: 0,
        updatedAt: "",
        empty: true
      };
}

function publicWorkspace(workspace) {
  return {
    ...publicWorkspaceSummary(workspace),
    disputes: Array.isArray(workspace?.disputes) ? workspace.disputes : []
  };
}

function sanitizeDisputes(disputes) {
  if (!Array.isArray(disputes)) return [];
  return disputes.slice(0, 250).map((dispute, index) => sanitizeDispute(dispute, index)).filter(Boolean);
}

function sanitizeDispute(dispute, index) {
  if (!dispute || typeof dispute !== "object") return null;
  const id = cleanText(dispute.id, 80) || `du_${Date.now().toString(36)}_${index}`;
  return {
    id,
    processor: cleanText(dispute.processor, 80),
    orderId: cleanText(dispute.orderId, 120),
    customer: cleanText(dispute.customer, 160),
    email: normalizeEmail(dispute.email),
    amount: Math.max(0, Number(dispute.amount || 0)),
    reason: cleanText(dispute.reason, 80),
    dueDate: cleanText(dispute.dueDate, 20),
    status: cleanText(dispute.status, 40) || "collecting",
    product: cleanText(dispute.product, 220),
    notes: cleanText(dispute.notes, 4000),
    narrative: cleanText(dispute.narrative, 8000),
    evidence: Array.isArray(dispute.evidence)
      ? dispute.evidence.slice(0, 80).map(item => cleanText(item, 120)).filter(Boolean)
      : []
  };
}

async function findOrFetchLicenseRecord(email, credential) {
  const localRecord = findLicenseRecord(email, credential);
  if (localRecord) return localRecord;
  const stripeRecord = await findStripeLicenseRecord(email, credential).catch(error => {
    console.error("Stripe session lookup failed", error.message);
    return null;
  });
  if (!stripeRecord) return null;
  persistCustomerRecordIfMissing(stripeRecord.customerRecord);
  return stripeRecord.licenseRecord;
}

function findLicenseRecord(email, credential) {
  if (!credential) return null;
  return getLicenseRecords().find(record => {
    const emailMatches = !email || record.email === email;
    const tokenMatches = timingSafeStringEqual(record.token, credential);
    const sessionMatches = Boolean(email) && timingSafeStringEqual(record.checkoutSessionId, credential);
    return emailMatches && (tokenMatches || sessionMatches);
  }) || null;
}

function getLicenseRecords() {
  const allowTestLicenses = process.env.ALLOW_TEST_LICENSES === "true";
  return readRecords("customers.jsonl")
    .filter(customer => customer.paymentStatus === "paid")
    .filter(customer => customer.livemode === true || allowTestLicenses)
    .map(buildLicenseRecordFromCustomer)
    .filter(Boolean);
}

function buildLicenseRecordFromCustomer(customer) {
  const email = normalizeEmail(customer.customerEmail);
  const checkoutSessionId = cleanText(customer.checkoutSessionId, 220);
  if (!email || !checkoutSessionId) return null;
  return {
    email,
    checkoutSessionId,
    sourceEventId: cleanText(customer.sourceEventId, 220),
    amountTotal: Number(customer.amountTotal || 0),
    livemode: Boolean(customer.livemode),
    plan: inferLicensePlan(customer),
    token: makeLicenseToken(customer)
  };
}

async function findStripeLicenseRecord(email, credential) {
  const sessionId = cleanText(credential, 220);
  if (!sessionId.startsWith("cs_")) return null;
  if (!email) return null;
  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!hasRealSecret(secretKey, "sk_live_replace_me")) return null;

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });
  if (!response.ok) return null;
  const session = await response.json();
  const customerEmail = normalizeEmail(session.customer_details?.email || session.customer_email || "");
  const allowTestLicenses = process.env.ALLOW_TEST_LICENSES === "true";
  if (!customerEmail || (email && customerEmail !== email)) return null;
  if (session.payment_status !== "paid") return null;
  if (session.livemode !== true && !allowTestLicenses) return null;

  const customerRecord = {
    sourceEventId: `stripe_session_lookup_${session.id}`,
    checkoutSessionId: session.id,
    customerEmail,
    amountTotal: Number(session.amount_total || 0),
    currency: session.currency || "usd",
    paymentStatus: session.payment_status,
    livemode: Boolean(session.livemode),
    createdAt: new Date().toISOString()
  };
  return {
    customerRecord,
    licenseRecord: buildLicenseRecordFromCustomer(customerRecord)
  };
}

function persistCustomerRecordIfMissing(customer) {
  const checkoutSessionId = cleanText(customer.checkoutSessionId, 220);
  const existing = readRecords("customers.jsonl").some(record =>
    cleanText(record.checkoutSessionId, 220) === checkoutSessionId
  );
  if (!existing) appendRecord("customers.jsonl", customer);
}

function makeLicenseToken(customer) {
  const seed = [
    normalizeEmail(customer.customerEmail),
    cleanText(customer.checkoutSessionId, 220),
    cleanText(customer.sourceEventId, 220),
    Number(customer.amountTotal || 0),
    customer.livemode === true ? "live" : "test"
  ].join(":");
  return crypto.createHmac("sha256", LICENSE_SECRET).update(seed).digest("hex").slice(0, 40);
}

function inferLicensePlan(customer) {
  const amount = Number(customer.amountTotal || 0);
  if (amount >= 9900) return "Core";
  return "Paid";
}

function normalizeEmail(value) {
  return cleanText(value, 320).toLowerCase();
}

function timingSafeStringEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function readRaw(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", chunk => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function readJson(request) {
  const raw = await readRaw(request);
  return raw.length ? JSON.parse(raw.toString("utf8")) : {};
}

function verifyStripeSignature(raw, signatureHeader, request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!hasRealSecret(secret, "whsec_replace_me")) return isLocalRequest(request);
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(",").map(part => part.split("=", 2)));
  if (!parts.t || !parts.v1) return false;
  const signedPayload = `${parts.t}.${raw.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(parts.v1);
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function sanitizeLead(payload) {
  return {
    email: String(payload.email || "").slice(0, 320),
    company: String(payload.company || "").slice(0, 140),
    source: String(payload.source || "unknown").slice(0, 80),
    createdAt: payload.createdAt || new Date().toISOString()
  };
}

function sanitizeFeedback(payload) {
  return {
    id: String(payload.id || `fb_${Date.now().toString(36)}`),
    email: String(payload.email || "").slice(0, 320),
    type: String(payload.type || "missing_feature").slice(0, 80),
    priority: String(payload.priority || "medium").slice(0, 20),
    version: String(payload.version || "0.1.0").slice(0, 20),
    message: String(payload.message || "").slice(0, 4000),
    createdAt: payload.createdAt || new Date().toISOString()
  };
}

function buildBusinessRegister(settings) {
  const existing = readBusinessRegister();
  const completed = settings.completedSystems || {};
  const publicSiteUrl = cleanUrl(settings.websiteUrl) || existing.business?.publicSiteUrl || process.env.PUBLIC_SITE_URL || "https://yourdomain.com";
  const backendUrl = cleanUrl(settings.backendUrl) || existing.business?.backendUrl || process.env.BACKEND_URL || "";
  const legalName = cleanText(settings.businessLegalName, 120) || existing.business?.legalOrTradeName || "AR Trading";
  const payoutBankLabel = cleanText(settings.payoutBankLabel, 160) || existing.cashAccess?.bankAccountLabel || "Chase Business account - AR Trading";
  const corePrice = CORE_PLAN_PRICE;
  const legacyPaymentLinks = existing.checkout?.legacyPaymentLinks || {
    growth: existing.checkout?.growthLink === LEGACY_GROWTH_PAYMENT_LINK ? LEGACY_GROWTH_PAYMENT_LINK : existing.checkout?.growthLink || ""
  };

  return {
    ...existing,
    updatedAt: new Date().toISOString(),
    business: {
      brandName: existing.business?.brandName || "DisputeDesk",
      businessStructure: existing.business?.businessStructure || "sole_proprietorship_or_dba",
      legalOrTradeName: legalName,
      domain: publicSiteUrl.replace(/^https?:\/\//, "").split("/")[0] || existing.business?.domain || "yourdomain.com",
      supportEmail: cleanText(settings.businessEmail, 320) || existing.business?.supportEmail || "support@yourdomain.com",
      publicSiteUrl,
      backendUrl,
      operatorIdentity: existing.business?.operatorIdentity || "faceless_brand_led"
    },
    pricing: {
      coreMonthly: corePrice,
      cadence: "monthly",
      cancellation: "cancel_anytime",
      offer: "DisputeDesk Core"
    },
    checkout: {
      stripeMode: "payment_links",
      coreLink: cleanUrl(settings.coreLink) || existing.checkout?.coreLink || "",
      trialLink: "",
      starterLink: "",
      growthLink: "",
      scaleLink: "",
      legacyPaymentLinks,
      webhookEndpoint: backendUrl ? `${backendUrl.replace(/\/$/, "")}/api/stripe/webhook` : "",
      fundsCustody: "stripe_only",
      stripeObjects: existing.checkout?.stripeObjects || {}
    },
    cashAccess: {
      payoutRail: "stripe_payouts",
      bankName: "Chase Business",
      accountHolderName: legalName,
      bankAccountLabel: payoutBankLabel,
      bankDetailsStored: false,
      stripeBankReady: Boolean(completed.stripeBank || existing.cashAccess?.stripeBankReady),
      stripeIdentityReady: Boolean(completed.stripeIdentity || existing.cashAccess?.stripeIdentityReady),
      stripeBusinessMatchReady: Boolean(completed.stripeBusinessMatch || existing.cashAccess?.stripeBusinessMatchReady)
    },
    adSpend: {
      monthlyValidationBudget: Math.min(25, Number(settings.monthlyBudget || existing.adSpend?.monthlyValidationBudget || 25)),
      dailyAdCap: Math.min(5, Number(settings.dailyAdCap || existing.adSpend?.dailyAdCap || 5)),
      fundingCardLabel: cleanText(settings.fundingCardLabel, 120) || existing.adSpend?.fundingCardLabel || "Robinhood virtual card - ads",
      rawCardDataStored: false,
      channels: ["reddit_ads"],
      disabledChannels: ["linkedin_ads"]
    },
    providerAccounts: {
      stripeAccountConfigured: Boolean(existing.providerAccounts?.stripeAccountConfigured),
      metaBusinessPortfolioId: cleanText(settings.metaBusinessPortfolioId, 80) || existing.providerAccounts?.metaBusinessPortfolioId || "",
      metaAdAccountId: cleanText(settings.metaAdAccountId, 80) || existing.providerAccounts?.metaAdAccountId || "",
      googleAdsCustomerId: cleanText(settings.googleAdsCustomerId, 80) || existing.providerAccounts?.googleAdsCustomerId || "",
      redditAdAccountId: cleanText(settings.redditAdAccountId, 80) || existing.providerAccounts?.redditAdAccountId || ""
    },
    compliance: {
      termsPublished: true,
      privacyPublished: true,
      refundPolicyPublished: true,
      aiCodexDisclosure: true,
      noLegalAdvice: true,
      noOutcomeGuarantee: true,
      userAcceptsRisk: true,
      selfServeOnly: true
    }
  };
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function hasRealSecret(value, placeholder) {
  const text = String(value || "").trim();
  return Boolean(text && text !== placeholder && !text.endsWith("_replace_me") && !text.includes("•"));
}

function firstRealSecret(candidates) {
  for (const [value, placeholder] of candidates) {
    if (hasRealSecret(value, placeholder)) return value;
  }
  return "";
}

function cleanUrl(value) {
  const text = cleanText(value, 600);
  if (!text || text.includes("•")) return "";
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function buildOperatorRun(payload) {
  const leads = readRecords("leads.jsonl");
  const feedback = readRecords("feedback.jsonl");
  const customers = readRecords("customers.jsonl");
  const register = readBusinessRegister();
  const postedSettings = payload.settings || {};
  const settings = {
    ...postedSettings,
    coreLink: postedSettings.coreLink || register.checkout?.coreLink || "",
    payoutBankLabel: postedSettings.payoutBankLabel || register.cashAccess?.bankAccountLabel || "Chase Business account - AR Trading",
    completedSystems: {
      ...(postedSettings.completedSystems || {}),
      stripeBank: Boolean(postedSettings.completedSystems?.stripeBank || register.cashAccess?.stripeBankReady),
      stripeIdentity: Boolean(postedSettings.completedSystems?.stripeIdentity || register.cashAccess?.stripeIdentityReady),
      stripeBusinessMatch: Boolean(postedSettings.completedSystems?.stripeBusinessMatch || register.cashAccess?.stripeBusinessMatchReady)
    }
  };
  const actions = [];
  const now = new Date().toISOString();

  if (!settings.coreLink) {
    actions.push(operatorAction("checkout", "high", "Add live Core Stripe Payment Link", "The storefront cannot accept software revenue until the $99/month Core Payment Link is configured.", now));
  }

  if (!settings.completedSystems?.stripeBank || !settings.completedSystems?.stripeIdentity || !settings.completedSystems?.stripeBusinessMatch) {
    const payoutBank = settings.payoutBankLabel || "Chase Business account - AR Trading";
    actions.push(operatorAction("cash", "high", "Complete Stripe payout readiness", `Link ${payoutBank} inside Stripe, then complete identity, tax, and business-name checks so paid checkout revenue can settle to the business bank account.`, now));
  }

  if (Number(settings.monthlyBudget || 0) > Number(settings.fundingMonthlyCap || 0)) {
    actions.push(operatorAction("spend", "high", "Budget exceeds card cap", "Reduce launch budget or raise the virtual-card cap inside the card issuer. Do not let platform billing exceed the approved cap.", now));
  }

  if (leads.length > customers.length) {
    actions.push(operatorAction("sales", "medium", "Automate unmatched-lead nurture", `${leads.length - customers.length} lead(s) have not become paid customers. Route them to self-serve Core checkout or feedback messaging; do not sell calls, consulting, or custom setup.`, now));
  }

  const highFeedback = feedback.filter(item => item.priority === "high");
  if (highFeedback.length > 0) {
    actions.push(operatorAction("product", "medium", "Review high-priority feedback", `${highFeedback.length} high-priority feedback item(s) should be triaged into patch, minor, or pricing-test release buckets.`, now));
  }

  if (customers.length > 0) {
    actions.push(operatorAction("fulfillment", "medium", "Verify self-serve access", `${customers.length} paid customer event(s) found. Verify each buyer receives self-serve product access, documentation, and billing portal links without requiring direct service delivery.`, now));
  }

  actions.push(operatorAction("compliance", "low", "Weekly compliance review", "Confirm claims, terms, privacy, refund policy, AI disclosure, and ad creatives still match the actual product.", now));
  actions.push(operatorAction("finance", "low", "Reconcile Stripe payouts", "Compare Stripe customer events, payout status, refunds, and local customer records before increasing ad spend.", now));

  return {
    id: `run_${Date.now().toString(36)}`,
    createdAt: now,
    leadCount: leads.length,
    feedbackCount: feedback.length,
    customerCount: customers.length,
    actions
  };
}

function buildBusinessStatus() {
  const register = readBusinessRegister();
  const leads = readRecords("leads.jsonl");
  const feedback = readRecords("feedback.jsonl");
  const customers = readRecords("customers.jsonl");
  const workspaces = readRecords("workspaces.jsonl");
  const stripeEvents = readRecords("stripe-events.jsonl");
  const actions = readRecords("operator-actions.jsonl");
  const openActions = actions.filter(action => action.status !== "done");
  const highActions = openActions.filter(action => action.priority === "high");
  const paidCustomers = customers.filter(customer => customer.paymentStatus === "paid");
  const livePaidCustomers = paidCustomers.filter(customer => customer.livemode === true);
  const grossRevenue = paidCustomers.reduce((sum, customer) => sum + Number(customer.amountTotal || 0), 0) / 100;
  const liveGrossRevenue = livePaidCustomers.reduce((sum, customer) => sum + Number(customer.amountTotal || 0), 0) / 100;
  const stripeObjects = register.checkout?.stripeObjects || {};
  const stripeProducts = stripeObjects.products || {};
  const stripeProductCount = Object.values(stripeProducts).filter(product => (
    typeof product === "string" ? Boolean(product) : Boolean(product?.createdInStripe)
  )).length;
  const hasRegisteredPaidStripeLink = Boolean(register.checkout?.coreLink);
  const hasRegisteredStripePaymentLinks = hasRegisteredPaidStripeLink;
  const stripePaymentLinksPausedByReview = Boolean(register.checkout?.paymentLinksPausedByStripeReview);

  return {
    ok: true,
    service: "disputedesk",
    version: "0.1.0",
    checkedAt: new Date().toISOString(),
    environment: {
      host: HOST,
      port: PORT,
      publicSiteUrl: register.business?.publicSiteUrl || process.env.PUBLIC_SITE_URL || "",
      backendUrl: register.business?.backendUrl || process.env.BACKEND_URL || "",
      adminTokenConfigured: Boolean(ADMIN_TOKEN),
      storageEncryptionConfigured: hasRealSecret(STORAGE_ENCRYPTION_SECRET, "replace-with-long-random-data-encryption-key"),
      stripeSecretKeyConfigured: hasRealSecret(process.env.STRIPE_SECRET_KEY, "sk_live_replace_me"),
      stripeWebhookSecretConfigured: hasRealSecret(process.env.STRIPE_WEBHOOK_SECRET, "whsec_replace_me"),
      payoutReadiness: payoutReadiness(register),
      licenseSecretConfigured: hasRealSecret(process.env.LICENSE_SECRET, "replace-with-long-random-license-secret") || hasRealSecret(process.env.STRIPE_WEBHOOK_SECRET, "whsec_replace_me") || Boolean(ADMIN_TOKEN),
      metaCapiConfigured: Boolean(process.env.META_PIXEL_ID && process.env.META_ACCESS_TOKEN)
    },
    counts: {
      leads: leads.length,
      feedback: feedback.length,
      customers: customers.length,
      paidCustomers: paidCustomers.length,
      livePaidCustomers: livePaidCustomers.length,
      workspaces: new Set(workspaces.map(workspace => workspace.workspaceId).filter(Boolean)).size,
      workspaceSnapshots: workspaces.length,
      stripeEvents: stripeEvents.length,
      openActions: openActions.length,
      highActions: highActions.length
    },
    revenue: {
      grossCheckoutRevenue: grossRevenue,
      liveGrossCheckoutRevenue: liveGrossRevenue,
      currency: "USD",
      fundsCustody: "stripe_only"
    },
    stripe: {
      accountConfigured: Boolean(register.providerAccounts?.stripeAccountConfigured),
      reviewStatus: register.providerAccounts?.stripeReviewStatus || "unknown",
      productCatalogReady: stripeProductCount >= 1,
      productCount: stripeProductCount,
      paymentLinksReady: hasRegisteredStripePaymentLinks,
      paymentLinksPausedByReview: stripePaymentLinksPausedByReview,
      paymentLinksPauseReason: register.checkout?.paymentLinksPausedReason || ""
    },
    license: {
      gatingEnabled: true,
      liveLicenseCount: livePaidCustomers.length,
      source: "live Stripe checkout.session.completed records plus server-side Stripe Checkout Session lookup when configured",
      testLicensesAllowed: process.env.ALLOW_TEST_LICENSES === "true"
    },
    workspace: {
      persistenceReady: hasRealSecret(STORAGE_ENCRYPTION_SECRET, "replace-with-long-random-data-encryption-key"),
      encryptedServerRecords: true,
      workspaceCount: new Set(workspaces.map(workspace => workspace.workspaceId).filter(Boolean)).size,
      snapshotCount: workspaces.length,
      storage: "encrypted_jsonl"
    },
    latest: {
      lead: leads.at(-1)?.createdAt || null,
      feedback: feedback.at(-1)?.createdAt || null,
      customer: customers.at(-1)?.createdAt || null,
      workspace: workspaces.at(-1)?.updatedAt || null,
      stripeEvent: stripeEvents.at(-1)?.receivedAt || null,
      action: actions.at(-1)?.createdAt || null
    },
    readiness: {
      hasLiveIncomeEvidence: livePaidCustomers.length > 0,
      canAcceptPayments: hasRegisteredPaidStripeLink && !stripePaymentLinksPausedByReview,
      hasLeadCapture: true,
      hasFeedbackCapture: true,
      hasOperatorLoop: true,
      hasPaidAccessGate: true,
      hasCustomerWorkspacePersistence: hasRealSecret(STORAGE_ENCRYPTION_SECRET, "replace-with-long-random-data-encryption-key"),
      hasPolicyPages: ["terms.html", "privacy.html", "refund.html"].every(file => fs.existsSync(path.join(ROOT, file))),
      hasBusinessRegister: fs.existsSync(REGISTER_FILE),
      hasRegisteredPayoutDestination: Boolean(register.cashAccess?.bankAccountLabel),
      hasStripeProductCatalog: stripeProductCount >= 1,
      hasRegisteredStripePaymentLinks,
      hasRegisteredPaidStripeLink,
      stripePaymentLinksPausedByReview
    }
  };
}

function buildIncomeEvidence() {
  const customers = readRecords("customers.jsonl");
  const paidCustomers = customers.filter(customer => customer.paymentStatus === "paid");
  const livePaidCustomers = paidCustomers.filter(customer => customer.livemode === true);
  const testPaidCustomers = paidCustomers.filter(customer => customer.livemode !== true);
  const liveGrossRevenue = livePaidCustomers.reduce((sum, customer) => sum + Number(customer.amountTotal || 0), 0) / 100;
  const testGrossRevenue = testPaidCustomers.reduce((sum, customer) => sum + Number(customer.amountTotal || 0), 0) / 100;

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    evidenceStandard: "Live Stripe checkout.session.completed events with payment_status=paid and livemode=true.",
    incomeProducing: livePaidCustomers.length > 0,
    live: {
      paidCustomerCount: livePaidCustomers.length,
      grossCheckoutRevenue: liveGrossRevenue,
      currency: "USD",
      records: livePaidCustomers
    },
    testOrDemo: {
      paidCustomerCount: testPaidCustomers.length,
      grossCheckoutRevenue: testGrossRevenue,
      records: testPaidCustomers
    },
    note: "This app monitors evidence of income but does not hold funds. Cash access remains in Stripe payouts to the configured bank account."
  };
}

function buildProfitReport() {
  const register = readBusinessRegister();
  const status = buildBusinessStatus();
  const income = buildIncomeEvidence();
  const corePrice = Number(register.pricing?.coreMonthly || CORE_PLAN_PRICE);
  const grossMargin = 0.88;
  const validationBudget = Number(register.adSpend?.monthlyValidationBudget || 25);
  const dailyAdCap = Number(register.adSpend?.dailyAdCap || 5);
  const firstMonthGrossProfit = corePrice * grossMargin;
  const blockers = buildProfitBlockers(register, status, income);

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    profitableOperatingRule: "Do not increase spend until the first month gross profit from confirmed live customers exceeds acquisition spend or there is clear self-serve buying intent.",
    economics: {
      corePriceMonthlyUsd: corePrice,
      assumedGrossMargin: grossMargin,
      firstMonthGrossProfitPerCustomerUsd: roundMoney(firstMonthGrossProfit),
      validationBudgetUsd: validationBudget,
      dailyAdCapUsd: dailyAdCap,
      breakEvenCacUsd: roundMoney(firstMonthGrossProfit),
      oneCustomerReturnOn25DollarTest: roundMoney(firstMonthGrossProfit - validationBudget),
      requiredPaidCustomersToCoverValidationBudget: Math.ceil(validationBudget / firstMonthGrossProfit),
      requiredConversionAtBudget: `${((validationBudget / firstMonthGrossProfit) * 100).toFixed(1)}%`
    },
    currentEvidence: {
      liveRevenueUsd: income.live?.grossCheckoutRevenue || 0,
      liveCustomers: income.live?.paidCustomerCount || 0,
      leads: status.counts?.leads || 0,
      feedback: status.counts?.feedback || 0,
      canAcceptPayments: Boolean(status.readiness?.canAcceptPayments),
      paidAccessGate: Boolean(status.readiness?.hasPaidAccessGate),
      customerWorkspacePersistence: Boolean(status.readiness?.hasCustomerWorkspacePersistence),
      payoutReady: payoutReadiness(register).ready
    },
    nextAction: blockers[0] || {
      area: "growth",
      priority: "medium",
      title: "Run $25 Reddit validation",
      body: "Launch one Reddit campaign at $5/day for 5 days and stop unless it produces one live checkout or three strong self-serve feedback submissions.",
      owner: "operator"
    },
    blockers
  };
}

function buildProfitBlockers(register, status, income) {
  const blockers = [];
  const backendUrl = register.business?.backendUrl || process.env.BACKEND_URL || "";
  const encryptionReady = hasRealSecret(STORAGE_ENCRYPTION_SECRET, "replace-with-long-random-data-encryption-key");
  const payoutReady = payoutReadiness(register).ready;
  const webhookReady = hasRealSecret(process.env.STRIPE_WEBHOOK_SECRET, "whsec_replace_me");
  const stripeLookupReady = hasRealSecret(process.env.STRIPE_SECRET_KEY, "sk_live_replace_me");
  const redditReady = Boolean(register.providerAccounts?.redditAdAccountId || process.env.REDDIT_AD_ACCOUNT_ID || process.env.REDDIT_ADS_ACCESS_TOKEN);

  if (!backendUrl) blockers.push(profitBlocker("fulfillment", "high", "Deploy public backend", "GitHub Pages can sell the product, but it cannot receive Stripe webhooks or issue paid access from live events. Deploy the Node server and set BACKEND_URL."));
  if (!encryptionReady) blockers.push(profitBlocker("security", "high", "Set data encryption key", "Set DATA_ENCRYPTION_KEY on the backend host before collecting leads, feedback, customer records, or Stripe event records."));
  if (!status.readiness?.hasCustomerWorkspacePersistence) blockers.push(profitBlocker("fulfillment", "high", "Enable customer workspace persistence", "Subscribers need encrypted server-side workspace records so they can return after checkout and continue their dispute queue."));
  if (!webhookReady) blockers.push(profitBlocker("fulfillment", "high", "Connect Stripe webhook", "Set Stripe to send checkout.session.completed to BACKEND_URL/api/stripe/webhook and set STRIPE_WEBHOOK_SECRET on the backend host."));
  if (!stripeLookupReady) blockers.push(profitBlocker("fulfillment", "high", "Set server-side Stripe checkout lookup key", "Set STRIPE_SECRET_KEY or a suitably restricted Stripe server key on the backend host so paid customers can verify access even if webhook storage is reset."));
  if (!payoutReady) blockers.push(profitBlocker("cash", "high", "Finish Stripe payout readiness", "Inside Stripe only, link Chase Business for AR Trading and complete identity, tax, and business-name checks so collected cash can settle."));
  if (!redditReady) blockers.push(profitBlocker("acquisition", "medium", "Create Reddit Ads account with capped billing", "Add the capped virtual card inside Reddit Ads, keep the campaign at $5/day for 5 days, and paste the Reddit ad account ID into Launch."));
  if (!income.incomeProducing && status.readiness?.canAcceptPayments && blockers.length === 0) blockers.push(profitBlocker("proof", "medium", "Wait for live paid checkout evidence", "The business is ready to validate. Live income only counts after a Stripe live paid checkout event reaches the webhook.", "system"));
  return blockers;
}

function payoutReadiness(register) {
  const bank = process.env.STRIPE_BANK_READY === "true" || Boolean(register.cashAccess?.stripeBankReady);
  const identity = process.env.STRIPE_IDENTITY_READY === "true" || Boolean(register.cashAccess?.stripeIdentityReady);
  const businessMatch = process.env.STRIPE_BUSINESS_MATCH_READY === "true" || Boolean(register.cashAccess?.stripeBusinessMatchReady);
  return {
    bank,
    identity,
    businessMatch,
    ready: Boolean(bank && identity && businessMatch)
  };
}

function profitBlocker(area, priority, title, body, owner = "operator") {
  return { area, priority, title, body, owner };
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function operatorAction(area, priority, title, body, createdAt) {
  return {
    id: crypto.createHash("sha1").update(`${area}:${priority}:${title}:${createdAt.slice(0, 10)}`).digest("hex").slice(0, 12),
    area,
    priority,
    title,
    body,
    status: "open",
    createdAt
  };
}

async function sendMetaEvent(eventName, payload) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!pixelId || !accessToken || !payload.email) return;

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: payload.eventSourceUrl || process.env.PUBLIC_SITE_URL || "",
        user_data: {
          em: [hashValue(payload.email)]
        },
        custom_data: {
          currency: String(payload.currency || "usd").toUpperCase(),
          value: Number(payload.value || 0)
        }
      }
    ]
  };

  await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}
