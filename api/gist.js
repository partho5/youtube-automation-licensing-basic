// api/gist.js
// Simple JSON "database" backed by a private GitHub Gist.
// Reads and writes a single file (licenses.json) inside the gist.


const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = process.env.GIST_ID;
const FILE_NAME = "yt-automation-tmp-licenses.json";

/**
 * Fetches and parses the JSON license file from the private Gist
 */
async function getLicenses() {
  if (!GITHUB_TOKEN || !GIST_ID) {
    throw new Error("Missing GITHUB_TOKEN or GIST_ID environment variables");
  }

  const url = `https://api.github.com/gists/${GIST_ID}`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "Vercel-Licensing-Server"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Gist: ${response.statusText}`);
  }

  const gist = await response.json();
  const fileContent = gist.files[FILE_NAME]?.content;
  if (!fileContent) {
    return {};
  }

  return JSON.parse(fileContent);
}

/**
 * Patches and saves the updated JSON license data to the private Gist
 */
async function saveLicenses(licenses) {
  if (!GITHUB_TOKEN || !GIST_ID) {
    throw new Error("Missing GITHUB_TOKEN or GIST_ID environment variables");
  }

  const url = `https://api.github.com/gists/${GIST_ID}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "Vercel-Licensing-Server",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      files: {
        [FILE_NAME]: {
          content: JSON.stringify(licenses, null, 2)
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update Gist: ${response.statusText}`);
  }

  return true;
}

module.exports = {
  getLicenses,
  saveLicenses
};