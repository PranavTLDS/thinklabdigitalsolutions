# ThinkLab Digital Solutions

Marketing site, CRM admin and visual page editor, running on Cloudflare Workers (free plan): Hono API, D1 (SQLite) for leads and CMS data, KV for edited pages and uploads.

```
site/      static pages, admin UI and client scripts (served as Workers assets)
src/       Worker: API, auth, page/upload serving
migrations/ D1 schema and seed content
```

## Local development
```bash
npm install
echo 'ADMIN_PASSWORD=choose-one' > .dev.vars
npm run db:local
npm run dev        # http://localhost:8787, admin at /admin (user: admin)
```

## Deploy (free)
```bash
npx wrangler login
npx wrangler d1 create thinklab        # put the database_id in wrangler.jsonc
npx wrangler kv namespace create STORE # put the id in wrangler.jsonc
npm run db:remote
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

## Notes
- `/admin`, `/api/admin/*` and `/api/cms/*` (except the public `published` endpoint) use HTTP Basic auth. Username `admin` (or set `ADMIN_USER`); password is the `ADMIN_PASSWORD` secret. Resume downloads need it too.
- Pages saved in the studio are stored in KV and override the bundled files in `site/`. KV is eventually consistent, so a save can take up to a minute to show everywhere. Free KV allows 1,000 writes a day.
- Uploads are stored in KV, 10MB max each.

## Auto-deploy
Every push to `main` runs `.github/workflows/deploy.yml` (migrations, then deploy). It needs two repo secrets (Settings → Secrets and variables → Actions): `CLOUDFLARE_API_TOKEN` (the "Edit Cloudflare Workers" template plus D1 Edit) and `CLOUDFLARE_ACCOUNT_ID`.
