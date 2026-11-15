export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("lib/env");
    // Fail fast on startup if the environment is misconfigured.
    getEnv();
  }
}
