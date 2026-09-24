# Buy Art store

The storefront and admin panel use a Node/Express API backed by a SQLite database. The same server serves the built React site and `/api` routes. SQLite is stored in `storage/store.sqlite` locally; production must mount a persistent disk at the configured database path.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and replace the admin password and session secret.
3. Run `npm install` and `npm run dev`.
4. Open `http://localhost:5173`. The API runs on port 3000; Vite proxies `/api` to it.
5. Sign in at `/admin` using `ADMIN_PASSWORD`.

To run the production-shaped server locally, use `npm run build` followed by `npm start`, then open `http://localhost:3000`. The server reads the existing SQLite file from `DB_PATH`; the copied `.env` points to `storage/store.sqlite`.

The first server start creates an empty catalog and SQLite file. Add your real categories, products, shipping rates and settings from `/admin` before exposing the app publicly.

## Cloudinary and EmailJS

After signing in, open **Admin → Store settings**. Add the Cloudinary cloud name, API key and API secret; image uploads are signed by the server. Add the EmailJS service ID, order template ID, public key and contact template ID. Save settings before testing uploads or email.

Cloudinary's API secret is stored in the server's SQLite secrets table and is never returned to public pages. EmailJS public configuration is served to the storefront because the EmailJS browser SDK needs it.

## Import the old browser store

From the browser origin that contains the old store data, open the updated local app and sign in. In **Admin → Store settings**, download a JSON backup. On the destination server (including the Render domain), sign in, configure and save Cloudinary, then upload that backup from the same section. The importer transfers the database and image cache; if Cloudinary is configured, old local images are uploaded there during import. The backup includes store data and customer orders, so keep it private and delete it after confirming the import.

Keep the old browser data until you have checked products, orders and images on the deployed store.

## Deploy to Render

The included `render.yaml` defines a Node web service, health check and persistent disk at `/var/data`.

1. Push this repository to a private GitHub repository.
2. In Render, create a Blueprint and connect the repository.
3. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters when prompted. `SESSION_SECRET` is generated automatically.
4. Deploy. Render runs `npm ci && npm run build`, then `npm start`.
5. Open the service URL, sign in at `/admin`, configure Cloudinary and EmailJS, and upload your JSON backup if you need to move old browser data.
6. Add a custom domain in Render and update its DNS records.

The persistent disk keeps the SQLite file between restarts and deploys. It is tied to one service instance; keep this SQLite deployment at one instance. Back up the database before major changes.

Render's free web service does not provide a persistent disk, so it is suitable for a temporary preview only; its SQLite data can disappear after a restart or redeploy. For a live store using this SQLite architecture, use the configured Render Starter service. A completely free production setup requires migrating the database layer to a hosted database such as Supabase or Neon, then hosting the Node service separately.

## Git and deployment commands

The project is configured to keep `.env`, `storage/`, and SQLite files out of Git. From the project directory:

```powershell
git init
git add .
git commit -m "Prepare Buy Art store for deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPOSITORY.git
git push -u origin main
```

Before pushing, replace the remote URL and verify that `git status --short` does not list `.env` or `storage/store.sqlite`. For a local deployment check, run `npm run deploy:check`. In Render, connect the repository as a Blueprint; `render.yaml` runs the build and start commands and mounts the persistent SQLite disk automatically.

## API overview

- `GET /api/health` — deployment health check
- `GET /api/storefront` — public catalog and store settings
- `POST /api/coupons/validate` — server-side coupon validation
- `POST /api/orders` — server-side order and stock update
- `/api/admin/*` — session-protected admin data, settings and Cloudinary signatures

Admin sessions use an HttpOnly cookie. Passwords are hashed with Node's scrypt before storage. Never commit `.env` or the `storage/` directory.
