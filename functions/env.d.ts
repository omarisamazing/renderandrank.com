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

  // Minimal Cloudflare D1 surface used by this project.
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    run<T = unknown>(): Promise<{ success: boolean; results?: T[] }>;
    all<T = unknown>(): Promise<{ success: boolean; results: T[] }>;
    first<T = unknown>(colName?: string): Promise<T | null>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<unknown>;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  }

  // Minimal Cloudflare KV surface used by the optional rate limiter.
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  }

  // Minimal Cloudflare Workers AI surface used by the chat assistant
  // (functions/api/chat.ts). Bound as `env.AI` via the `[ai]` block in
  // wrangler.toml. With `stream: true` the run resolves to a ReadableStream of
  // SSE chunks; otherwise it resolves to the model's JSON output. The real
  // `Ai` type is provided by the Cloudflare runtime at build time — this is a
  // dependency-free stand-in so /functions type-checks without
  // @cloudflare/workers-types.
  interface Ai {
    run(
      model: string,
      inputs: Record<string, unknown>,
      options?: Record<string, unknown>
    ): Promise<ReadableStream | Record<string, unknown>>;
  }
}
