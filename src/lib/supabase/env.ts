const REQUIRED_SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function hasSupabaseEnv(): boolean {
  return REQUIRED_SUPABASE_ENV.every((key) => Boolean(process.env[key]));
}

export function assertSupabaseEnv(): void {
  const missing = REQUIRED_SUPABASE_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required Supabase environment variables: ${missing.join(", ")}.`);
  }
}
