// lib/gist.js
// Simple JSON "database" backed by a private GitHub Gist.
// Reads and writes a single file (licenses.json) inside the gist.

const GITHUB_API = "https://api.github.com";

function getConfig() {
  const { GITHUB_TOKEN, GIST_ID, GIST_FILENAME } = process.env;
  if (!GITHUB_TOKEN || !GIST_ID) {
    throw new Error("Missing GITHUB_TOKEN or GIST_ID environment variable");
  }
  return {
    token: GITHUB_TOKEN,
    gistId: GIST_ID,
    filename: GIST_FILENAME || "yt-automation-tmp-licenses.json",
  };
}

async function getLicenses() {
  const { token, gistId, filename } = getConfig();

  const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch gist (${res.status})`);
  }

  const gist = await res.json();
  const file = gist.files[filename];

  if (!file) {
    throw new Error(`File "${filename}" not found in gist`);
  }

  // Gists truncate content over ~1MB and set file.truncated = true.
  // Not a concern at low volume, but noted here for future reference.
  return JSON.parse(file.content || "{}");
}

async function saveLicenses(data) {
  const { token, gistId, filename } = getConfig();

  const res = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: {
        [filename]: {
          content: JSON.stringify(data, null, 2),
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update gist (${res.status})`);
  }
}

module.exports = { getLicenses, saveLicenses };
