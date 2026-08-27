// Minimal ambient types for Cloudflare Pages Functions so the /functions
// directory type-checks without pulling in @cloudflare/workers-types.
// Cloudflare's build bundles these functions with the full runtime types.
export {};

declare global {
  interface EventContext<Env, P extends string = string, Data = unknown> {
    request: Request;
    env: Env;
    params: Record<P, string | string[]>;
    data: Data;
    next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
    waitUntil: (promise: Promise<unknown>) => void;
  }

  type PagesFunction<Env = unknown, P extends string = string, Data = unknown> = (
    context: EventContext<Env, P, Data>
  ) => Response | Promise<Response>;
}
