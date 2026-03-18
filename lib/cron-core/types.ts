// Shared return type for all cron job executors.
export type CronResult = {
  processed: number;
  timestamp: string;
  skipped?: string;
  error?: string;
  /** Optional HTTP status code hint (e.g. 400 for config errors vs 500 for runtime). */
  statusCode?: number;
  [key: string]: unknown;
};
