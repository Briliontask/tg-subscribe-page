const { getStore } = require("@netlify/blobs");

const FALLBACK_ADMIN_PASSWORD = "change-me-123";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method Not Allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_) {
    return response(400, { error: "Invalid JSON body" });
  }

  const rawUrl = String(payload.url || "").trim();
  const customId = normalizeId(String(payload.id || "").trim());
  const providedPassword = String(payload.password || "");
  const expectedPassword =
    process.env.ADMIN_PASSWORD || FALLBACK_ADMIN_PASSWORD;

  if (!providedPassword || providedPassword !== expectedPassword) {
    return response(401, { error: "Unauthorized" });
  }

  if (!isHttpUrl(rawUrl)) {
    return response(400, { error: "Invalid URL" });
  }

  const store = openStore();
  if (!store) {
    return response(500, {
      error:
        "Blobs is not configured. Set BLOBS_SITE_ID and BLOBS_TOKEN in Netlify environment variables."
    });
  }
  const id = customId || generateId();
  const existing = await store.get(id, { type: "json" });

  if (existing) {
    return response(409, { error: "ID already exists. Use another ID." });
  }

  await store.set(
    id,
    JSON.stringify({
      url: rawUrl,
      createdAt: new Date().toISOString()
    })
  );

  return response(200, { id, shortPath: `/?id=${encodeURIComponent(id)}` });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}

function normalizeId(value) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function generateId() {
  return "y" + Math.random().toString(36).slice(2, 7);
}

function openStore() {
  try {
    return getStore("crm-links");
  } catch (_) {
    const siteID =
      process.env.BLOBS_SITE_ID ||
      process.env.NETLIFY_SITE_ID ||
      process.env.SITE_ID;
    const token =
      process.env.BLOBS_TOKEN ||
      process.env.NETLIFY_API_TOKEN ||
      process.env.NETLIFY_TOKEN;

    if (!siteID || !token) {
      return null;
    }

    return getStore("crm-links", { siteID, token });
  }
}
