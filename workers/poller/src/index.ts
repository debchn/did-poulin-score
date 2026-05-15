export default {
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log(`poller ran at ${new Date().toISOString()}`);
  },
};

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}
