// Vercel Edge Function.
// Instead of streaming the APK, we 302-redirect to the github.com Releases URL.
// This means the actual download comes from github.com (trusted by Google),
// while your custom domain acts only as a short, memorable entry point.

export const config = { runtime: "edge" };

const OWNER = process.env.GITHUB_OWNER;
const REPO  = process.env.GITHUB_REPO;

export default async function handler(req) {
  const url  = new URL(req.url);
  const slug = url.searchParams.get("s");

  if (!slug) {
    return new Response("Not found", { status: 404 });
  }

  // Look up the release + its APK asset via GitHub API
  const apiUrl = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases/tags/" + encodeURIComponent(slug);
  const apiRes = await fetch(apiUrl, {
    headers: { "Accept": "application/vnd.github+json" },
    cache: "no-store",
  });

  if (apiRes.status === 404) {
    return new Response("Link not found", { status: 404 });
  }
  if (!apiRes.ok) {
    return new Response("Upstream error", { status: 502 });
  }

  const release = await apiRes.json();
  const asset = (release.assets || [])[0];
  if (!asset) {
    return new Response("No APK on this release", { status: 404 });
  }

  const downloadUrl = "https://github.com/" + OWNER + "/" + REPO +
                      "/releases/download/" + encodeURIComponent(slug) +
                      "/" + encodeURIComponent(asset.name);

  return Response.redirect(downloadUrl, 302);
}
