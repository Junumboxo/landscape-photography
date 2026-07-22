# Deployment & setup

This site is a **static Hugo site** hosted on **Cloudflare Pages**, gated with
**Cloudflare Access** while it's friends-only, with an upload UI at `/admin`
(Sveltia CMS) that commits straight to GitHub. No Railway, no server, no database.

## Local development

```bash
brew install hugo              # one-time
git submodule update --init    # pull the PaperMod theme
hugo server                    # preview at http://localhost:1313
```

Add a photo:  `hugo new photos/my-photo/index.md` then drop the image in that
folder as `cover.jpg`. Add a post:  `hugo new posts/my-post.md`.
(Or just use the `/admin` upload page once deployed.)

---

## 1. Cloudflare Pages (hosting)

1. Push this repo to GitHub (`git push`).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Pick the `landscape-photography` repo. Build settings:
   - **Framework preset:** Hugo
   - **Build command:** `hugo --gc --minify`
   - **Build output directory:** `public`
   - **Environment variable:** `HUGO_VERSION = 0.164.0`
4. Deploy. Note the `*.pages.dev` URL it gives you.
5. Put that URL in `hugo.toml` → `baseURL`, commit, push (so links/RSS are correct).

> Images are committed as **normal Git files** (no Git LFS), so Cloudflare
> Pages builds them without any extra settings. Sveltia CMS also commits
> uploads as normal blobs, so keep it that way — don't re-enable LFS.

## 2. Cloudflare Access (friends-only gate)

1. Cloudflare dashboard → **Zero Trust → Access → Applications → Add → Self-hosted**.
2. Point it at your Pages domain.
3. Policy: **Allow**, rule = **Emails** → list your + your friends' emails.
   They'll get a one-time code by email to view the site.
4. When you're ready to go public: delete this Access application. Done.

## 3. GitHub OAuth + auth worker (makes `/admin` uploads work)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**:
   - **Homepage URL:** your Pages URL
   - **Authorization callback URL:** `https://landscapes-cms-auth.<your-subdomain>.workers.dev/callback`
     (you'll get the exact worker URL in the next step — come back and fix it)
   - Save the **Client ID** and generate a **Client Secret**.
2. Deploy the worker in `cms-auth/`:
   ```bash
   cd cms-auth
   npx wrangler deploy
   npx wrangler secret put GITHUB_CLIENT_ID       # paste Client ID
   npx wrangler secret put GITHUB_CLIENT_SECRET    # paste Client Secret
   ```
   Wrangler prints the worker URL (e.g. `https://landscapes-cms-auth.xxx.workers.dev`).
3. Put that worker URL into `static/admin/config.yml` → `backend.base_url`
   (replace the `YOUR-SUBDOMAIN` placeholder). Commit, push.
4. Go back to the GitHub OAuth App and make sure the callback URL matches
   `<worker-url>/callback`.
5. Visit `https://<your-site>/admin`, click **Login with GitHub**, and upload away.
