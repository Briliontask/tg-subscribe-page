const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return response(405, { error: "Method Not Allowed" });
  }

  const id = normalizeId(
    String(event.queryStringParameters?.id || "").trim()
  );
  if (!id) {
    return response(400, { error: "Missing or invalid id" });
  }

  const store = openStore();
  if (!store) {
    return response(500, {
      error:
        "Blobs is not configured. Set BLOBS_SITE_ID and BLOBS_TOKEN in Netlify environment variables."
    });
  }
  const record = await store.get(id, { type: "json" });

  if (!record || !isHttpUrl(String(record.url || ""))) {
    return response(404, { error: "Link not found" });
  }

  return response(200, { id, url: record.url });
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
