// Shared return type for all cron job executors.
export type CronResult = {
  processed: number;
  timestamp: string;
  skipped?: string;
  [key: string]: unknown;
};
