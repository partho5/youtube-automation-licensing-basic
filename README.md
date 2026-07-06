# License Validation API (Vercel + JSON-in-Gist)

Matches the request/response contract from `licensing.py`:

```
POST /api/license/validate
{ "license_key": "...", "machine_id": "..." }

-> { "licensedTo": "Name", "expireTime": "2026-12-31T23:59:59Z" }   # active
-> { "licensedTo": null,   "expireTime": "2026-01-01T00:00:00Z" }   # invalid/expired
```

## Why a Gist instead of a plain JSON file in the repo

Vercel serverless functions run on a read-only filesystem, and each
invocation may hit a different, short-lived instance. A JSON file bundled
in the deployment can be read, but writes don't persist and aren't shared
across instances. Since this system needs to permanently remember which
machine a key is bound to, the data has to live somewhere outside the
deployment itself.

A private GitHub Gist is used here because it's still just a JSON file
(no real database, no setup), is free, and easily handles very low
request volume. If volume ever grows, swap `lib/gist.js` for Vercel KV,
Blob, or a real DB without touching the endpoint logic.

## One-time setup

1. **Create the private gist**
   - Go to https://gist.github.com, create a new **secret** gist.
   - Filename: `licenses.json`
   - Content:
     ```json
     {
       "DEMO-LICENSE-KEY": {
         "licensedTo": "Test User",
         "expireTime": "2026-12-31T23:59:59Z",
         "machine_id": null
       }
     }
     ```
   - Save it, then copy the gist ID from the URL:
     `https://gist.github.com/<user>/<GIST_ID>`

2. **Create a GitHub token**
   - https://github.com/settings/tokens → generate a classic token with
     just the `gist` scope.

3. **Set environment variables in Vercel**
   (Project Settings → Environment Variables, or `vercel env add`)
   - `GITHUB_TOKEN`
   - `GIST_ID`
   - `GIST_FILENAME` (optional, defaults to `licenses.json`)
   - `ADMIN_SECRET` (any random string, used to protect `/api/license/admin`)

4. **Deploy**
   ```
   vercel deploy --prod
   ```

## Managing licenses

Add a new key:
```bash
curl -X POST https://your-app.vercel.app/api/license/admin \
  -H "x-admin-secret: <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"action":"add","license_key":"ABC-123","licensedTo":"Jane Doe","expireTime":"2026-12-31T23:59:59Z"}'
```

Reset a machine binding (e.g. customer got a new PC):
```bash
curl -X POST https://your-app.vercel.app/api/license/admin \
  -H "x-admin-secret: <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"action":"reset_machine","license_key":"ABC-123"}'
```

List everything:
```bash
curl -X POST https://your-app.vercel.app/api/license/admin \
  -H "x-admin-secret: <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"action":"list"}'
```

## Testing validate

```bash
curl -X POST https://your-app.vercel.app/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"license_key":"DEMO-LICENSE-KEY","machine_id":"test-machine-1"}'
```

First call binds `test-machine-1` to the key. A second call with a
different `machine_id` for the same key will return the invalid response.

## Notes on scale

- GitHub's API rate limit for authenticated requests is 5,000/hour, so
  "few requests only" is comfortably within range.
- Every validate call that binds a new machine does one gist read + one
  gist write. Calls that hit an already-bound, matching machine only do
  a read.
- Concurrent writes from simultaneous requests could theoretically race
  (last write wins), but at low volume this isn't a practical concern.
