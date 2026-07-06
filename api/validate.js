// api/validate.js
//
// POST body:  { "license_key": "...", "machine_id": "..." }
// Success:    { "licensedTo": "Name", "expireTime": "2026-12-31T23:59:59Z" }
// Invalid:    { "licensedTo": null,   "expireTime": "2026-01-01T00:00:00Z" }
//
// Matches licensing.py's expectation: it compares the current UTC ISO
// string against expireTime lexicographically, so expireTime must stay
// in strict ISO-8601 UTC format ("...Z") for that comparison to be valid.
// api/validate.js
//
// POST body:  { "license_key": "...", "machine_id": "..." }
// Success:    { "licensedTo": "Name", "expireTime": "2026-12-31T23:59:59Z" }
// Invalid:    { "licensedTo": null,   "expireTime": "2026-01-01T00:00:00Z" }
//
// Matches licensing.py's expectation: it compares the current UTC ISO
// string against expireTime lexicographically, so expireTime must stay
// in strict ISO-8601 UTC format ("...Z") for that comparison to be valid.

const { getLicenses, saveLicenses } = require("./gist");

const INVALID_RESPONSE = {
  licensedTo: null,
  expireTime: "2026-01-01T00:00:00Z",
};

// Helper function to read the raw request stream
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Parse the vanilla stream body manually
    const body = await getRequestBody(req);
    const { license_key, machine_id } = body;

    if (!license_key || !machine_id) {
      res.status(400).json({ error: "license_key and machine_id are required" });
      return;
    }

    const licenses = await getLicenses();
    const record = licenses[license_key];

    // Unknown key
    if (!record) {
      res.status(200).json(INVALID_RESPONSE);
      return;
    }

    const nowIso = new Date().toISOString();

    // Expired
    if (nowIso > record.expireTime) {
      res.status(200).json(INVALID_RESPONSE);
      return;
    }

    // First activation: bind this machine to the key
    if (!record.machine_id) {
      record.machine_id = machine_id;
      licenses[license_key] = record;
      await saveLicenses(licenses);
    } else if (record.machine_id !== machine_id) {
      // Already activated on a different machine
      res.status(200).json(INVALID_RESPONSE);
      return;
    }

    res.status(200).json({
      licensedTo: record.licensedTo,
      expireTime: record.expireTime,
    });
  } catch (err) {
    console.error(err);
    if (err.message === "Invalid JSON body") {
      res.status(400).json({ error: "Invalid JSON format" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};