/**
 * Tiny GitHub OAuth handler for Sveltia/Decap CMS.
 *
 * Deploy this as a Cloudflare Worker. It lets the /admin upload page log in
 * with GitHub without Netlify's git-gateway.
 *
 * Required Worker environment variables (set as encrypted secrets):
 *   GITHUB_CLIENT_ID      - from your GitHub OAuth App
 *   GITHUB_CLIENT_SECRET  - from your GitHub OAuth App
 *
 * Routes handled:
 *   GET /auth      -> redirects the user to GitHub to authorize
 *   GET /callback  -> exchanges the code for a token, hands it back to the CMS
 */

const PROVIDER = "github";

function html(body) {
  return new Response(body, { headers: { "content-type": "text/html;charset=UTF-8" } });
}

// The postMessage handshake the CMS listens for.
function postMessagePage(status, contentJSON) {
  return html(`<!doctype html><html><body><script>
    (function () {
      function send(){ window.opener && window.opener.postMessage(
        'authorization:${PROVIDER}:${status}:${contentJSON}', '*'); }
      window.addEventListener('message', send, false);
      send();
    })();
  </script>Signing you in…</body></html>`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const redirectUri = `${url.origin}/callback`;
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", "repo,user");
      authUrl.searchParams.set("state", crypto.randomUUID());
      return Response.redirect(authUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await tokenRes.json();

      if (data.error || !data.access_token) {
        return postMessagePage("error", JSON.stringify(data.error || "No access token"));
      }
      return postMessagePage(
        "success",
        JSON.stringify({ token: data.access_token, provider: PROVIDER })
      );
    }

    return new Response("Sveltia CMS auth worker. Use /auth to begin.", { status: 200 });
  },
};
