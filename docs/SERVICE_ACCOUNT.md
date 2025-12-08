# Using a Google Service Account securely

This document explains how to use a Google service account key with the Rose Sale API while keeping the key secure.

IMPORTANT: Do NOT commit the service account JSON key to git. Treat it like a secret.

1) Create a service account & key
- In Google Cloud Console: IAM & Admin → Service Accounts → Create Service Account.
- After creating, go to the service account → Keys → Add Key → Create new key → JSON. Download the JSON.

2) Share the Google Sheet with the service account
- Open your Google Sheet → Share → paste the service account email (e.g. `sa-name@project-id.iam.gserviceaccount.com`).
- Give Viewer permission for read-only access or Editor to allow writes/appends.

3) Preferred local development: store as base64 in an env var
- Base64-encode the JSON to avoid multiline issues in `.env` files.

macOS / Linux example:

```bash
# from project root
base64 -i /path/to/your-key.json | pbcopy   # macOS copies to clipboard
# then add to .env:
# GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=eyJ0eXAiOiJKV1QiL...
```

Or write directly to .env:

```bash
echo "GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=$(base64 -i /path/to/your-key.json)" >> .env
```

4) Alternative: point to a key file outside the repo
- Move the JSON to a safe path outside the project (e.g. `~/.secrets/sa-key.json`) and set in `.env`:

```text
GOOGLE_SERVICE_ACCOUNT_FILE=/Users/you/.secrets/sa-key.json
```

5) Remove any accidentally committed key
- If the key file was committed, remove it from the index and add to `.gitignore`:

```bash
git rm --cached path/to/celadon-rose-sale-fd10faaa81b8.json
git commit -m "remove service account key from repo"
```

- To remove from git history, use the BFG or `git filter-repo` (advanced). Example with BFG:

```bash
# Install BFG, then:
bfg --delete-files your-key.json
# then follow BFG's instructions to clean and force-push
```

6) Production
- Use your host's secret manager (recommended) to store the key or the base64 value.
- Do not paste the JSON into your repo or logs.

7) How the code uses the key
- The server supports either `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` (preferred) or `GOOGLE_SERVICE_ACCOUNT_FILE`.
- If neither is present, the server falls back to using an API key for public sheets.

8) Rotate keys periodically
- Delete unused keys in the Google Cloud Console and create new ones when needed.

If you'd like, I can add an automated check (pre-commit hook) to block commits that include JSON keys. Ask and I'll add it.