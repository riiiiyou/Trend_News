// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSchema } = await import('./lib/db')
    await initSchema().catch((err) => console.error('[instrumentation] schema init failed:', err))
    const { initScheduler } = await import('./lib/scheduler')
    initScheduler()
  }
}
