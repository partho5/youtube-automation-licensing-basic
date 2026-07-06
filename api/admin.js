// api/admin.js
//
// Small helper endpoint so you don't have to hand-edit the gist.
// Protect with header:  x-admin-secret: <ADMIN_SECRET>
//
// Add or update a license:
//   POST { "action": "add", "license_key": "ABC-123", "licensedTo": "Jane Doe", "expireTime": "2026-12-31T23:59:59Z" }
//
// Reset a machine binding (e.g. user got a new PC):
//   POST { "action": "reset_machine", "license_key": "ABC-123" }
//
// List all keys (no secrets returned beyond what's already in the store):
//   POST { "action": "list" }

const { getLicenses, saveLicenses } = require("./gist");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { action, license_key, licensedTo, expireTime } = req.body || {};

  try {
    const licenses = await getLicenses();

    if (action === "list") {
      res.status(200).json(licenses);
      return;
    }

    if (action === "add") {
      if (!license_key || !licensedTo || !expireTime) {
        res.status(400).json({
          error: "license_key, licensedTo, expireTime are required for 'add'",
        });
        return;
      }
      licenses[license_key] = {
        licensedTo,
        expireTime,
        machine_id: null,
      };
      await saveLicenses(licenses);
      res.status(200).json({ ok: true, license: licenses[license_key] });
      return;
    }

    if (action === "reset_machine") {
      if (!license_key || !licenses[license_key]) {
        res.status(404).json({ error: "license_key not found" });
        return;
      }
      licenses[license_key].machine_id = null;
      await saveLicenses(licenses);
      res.status(200).json({ ok: true, license: licenses[license_key] });
      return;
    }

    res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
