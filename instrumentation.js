// Next.js runs this once when the server starts. We use it to launch the
// background email scheduler (Node runtime only).
export async function register() {
  // Local/long-running server: use the in-process interval worker.
  // On Vercel (serverless), Vercel Cron hits /api/cron/* instead.
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    const { startScheduler } = await import('./lib/scheduler.js');
    startScheduler();
  }
}
