import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type MockResult = Promise<{ data: null; error: null }>;

type MockQueryBuilder = {
  then: Promise<{ data: null; error: null }>['then'];
  select: (...args: unknown[]) => MockQueryBuilder;
  insert: (...args: unknown[]) => MockQueryBuilder;
  update: (...args: unknown[]) => MockQueryBuilder;
  delete: (...args: unknown[]) => MockQueryBuilder;
  upsert: (...args: unknown[]) => MockQueryBuilder;
  rpc: (...args: unknown[]) => MockQueryBuilder;
  eq: (...args: unknown[]) => MockQueryBuilder;
  in: (...args: unknown[]) => MockQueryBuilder;
  ilike: (...args: unknown[]) => MockQueryBuilder;
  or: (...args: unknown[]) => MockQueryBuilder;
  order: (...args: unknown[]) => MockQueryBuilder;
  range: (...args: unknown[]) => MockQueryBuilder;
  limit: (...args: unknown[]) => MockQueryBuilder;
  maybeSingle: () => MockResult;
  single: () => MockResult;
  execute: () => MockResult;
};

function createQueryBuilder(): MockQueryBuilder {
  const builder = {} as MockQueryBuilder;

  const proxy = new Proxy(builder, {
    get(_target, property: string | symbol) {
      if (property === "then") {
        return (onfulfilled?: (value: { data: null; error: null }) => unknown, onrejected?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
      }

      if (property === "maybeSingle" || property === "single" || property === "execute") {
        return async () => ({ data: null, error: null });
      }

      return () => proxy;
    },
  }) as MockQueryBuilder;

  return proxy;
}

export function createMockSupabaseClient(): SupabaseClient<Database> {
  const queryBuilder = createQueryBuilder();

  const client = {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange() {
        return {
          data: { subscription: { unsubscribe() {} } },
        };
      },
      async signInWithPassword() {
        return { data: null, error: { message: "Supabase is not configured." } };
      },
      async signOut() {
        return { error: null };
      },
    },
    from() {
      return queryBuilder;
    },
    rpc() {
      return Promise.resolve({ data: null, error: null });
    },
  };

  return client as unknown as SupabaseClient<Database>;
}