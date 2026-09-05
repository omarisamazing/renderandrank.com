/**
 * Staging de-index guard for Cloudflare Pages Functions responses.
 *
 * `_headers` in `public/` can only match URL *paths*, not hostnames, so it
 * cannot scope an `X-Robots-Tag` to the temporary `*.pages.dev` subdomain.
 * This middleware closes that gap for every Functions response (API routes,
 * admin dashboard): when the request host ends with `.pages.dev`, it stamps
 * `X-Robots-Tag: noindex, nofollow` on the response.
 *
 * Static pages are covered separately at build time — `Layout.astro` emits
 * `<meta name="robots" content="noindex, nofollow">` whenever the build host
 * or canonical URL is a `*.pages.dev` host. Together the two layers ensure
 * only the future root domain gets crawled once connected.
 */
export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> {
  const response = await context.next();
  try {
    const host = new URL(context.request.url).hostname;
    if (host.endsWith('.pages.dev')) {
      const headers = new Headers(response.headers);
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  } catch {
    // Never break a response because of the SEO guard.
  }
  return response;
}
