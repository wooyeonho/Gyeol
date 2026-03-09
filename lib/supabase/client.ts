import { createBrowserClient } from "@supabase/ssr";
import { hasRequiredEnv } from "@/lib/env/required";

const REQUIRED_PUBLIC_SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const NOOP_ERROR = {
  message: "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
};

let warnedMissingEnv = false;

function createNoopQuery() {
  const result = { data: null, error: NOOP_ERROR, count: 0 };
  const handler: ProxyHandler<(...args: unknown[]) => unknown> = {
    get(_target, prop) {
      if (prop === "then") {
        return (onFulfilled?: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled, onRejected);
      }
      if (prop === "catch") {
        return (onRejected?: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected);
      }
      if (prop === "finally") {
        return (onFinally?: () => void) => Promise.resolve(result).finally(onFinally);
      }
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  };
  const proxy = new Proxy(() => undefined, handler);
  return proxy;
}

function createNoopSupabaseClient() {
  const queryFactory = () => createNoopQuery();
  const auth = {
    getUser: async () => ({ data: { user: null }, error: NOOP_ERROR }),
    getSession: async () => ({ data: { session: null }, error: NOOP_ERROR }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: NOOP_ERROR }),
    signUp: async () => ({ data: { user: null, session: null }, error: NOOP_ERROR }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({
      data: {
        subscription: {
          unsubscribe() {},
        },
      },
    }),
  };

  return {
    auth,
    from: () => queryFactory(),
    rpc: async () => ({ data: null, error: NOOP_ERROR }),
  } as unknown as ReturnType<typeof createBrowserClient>;
}

export function createClient() {
  if (!hasRequiredEnv(REQUIRED_PUBLIC_SUPABASE_ENV)) {
    if (!warnedMissingEnv) {
      warnedMissingEnv = true;
      console.warn("[Supabase] Missing public env. Running in graceful no-op mode.");
    }
    return createNoopSupabaseClient();
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
