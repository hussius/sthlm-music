/**
 * Job monitoring and failure alerting for BullMQ job queue.
 *
 * Features:
 * - Real-time job health monitoring
 * - Failure detection and alerting
 * - Queue metrics and statistics
 * - Human-readable health reports
 */

import { Queue, QueueEvents } from 'bullmq';
import { crawlQueue, queueEvents } from './jobs.js';

/**
 * Job health status interface.
 */
export interface JobHealthStatus {
  jobName: string;
  lastRun: Date | null;
  lastStatus: 'completed' | 'failed' | 'never_run';
  failureCount: number;
  successCount: number;
  avgDuration: number;  // milliseconds
}

/**
 * Check health of all scheduled jobs.
 *
 * Process:
 * 1. Get all repeatable jobs
 * 2. For each job, analyze recent executions
 * 3. Calculate success/failure counts
 * 4. Calculate average duration
 *
 * @returns Array of job health statuses
 */
export async function checkJobHealth(): Promise<JobHealthStatus[]> {
  const repeatableJobs = await crawlQueue.getRepeatableJobs();

  const statuses: JobHealthStatus[] = [];

  for (const job of repeatableJobs) {
    // Get completed jobs for this repeatable job
    const completed = await crawlQueue.getJobs(['completed'], 0, 10, false);
    const failed = await crawlQueue.getJobs(['failed'], 0, 10, false);

    const jobCompleted = completed.filter(j => j.name === job.id);
    const jobFailed = failed.filter(j => j.name === job.id);

    // Calculate stats
    const lastRun = jobCompleted[0]?.finishedOn ?
      new Date(jobCompleted[0].finishedOn) : null;

    const lastStatus =
      jobCompleted.length === 0 && jobFailed.length === 0 ? 'never_run' :
      jobCompleted.length > 0 ? 'completed' : 'failed';

    const avgDuration = jobCompleted.length > 0 ?
      jobCompleted.reduce((sum, j) =>
        sum + (j.finishedOn! - j.processedOn!), 0) / jobCompleted.length : 0;

    statuses.push({
      jobName: job.id,
      lastRun,
      lastStatus,
      failureCount: jobFailed.length,
      successCount: jobCompleted.length,
      avgDuration
    });
  }

  return statuses;
}

/**
 * Start monitoring jobs for failures and completion.
 *
 * Listens to job events:
 * - 'failed': Logs failure, sends alert immediately on first failure
 * - 'completed': Logs success with result
 *
 * Alerts are sent immediately on first failure (attempts >= 1).
 * Retries continue in background after alert is sent.
 */
export async function monitorJobs(): Promise<void> {
  // Listen for job failures and alert
  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    const job = await crawlQueue.getJob(jobId);
    const attempts = job?.attemptsMade || 0;

    console.error(`JOB FAILED: ${job?.name} (attempt ${attempts}/2)`);
    console.error(`Reason: ${failedReason}`);

    // Send alert immediately on first failure (don't wait for retries)
    if (attempts >= 1) {
      await sendAlert({
        type: 'job_failure',
        jobName: job?.name || 'unknown',
        jobId,
        reason: failedReason,
        timestamp: new Date(),
        attemptsRemaining: 2 - attempts
      });
    }
  });

  // Listen for job completions
  queueEvents.on('completed', async ({ jobId, returnvalue }) => {
    const job = await crawlQueue.getJob(jobId);
    console.log(`Job completed: ${job?.name}`, returnvalue);
  });

  console.log('Job monitoring started');
}

/**
 * Alert interface for failure notifications.
 */
interface Alert {
  type: 'job_failure' | 'health_check_failure';
  jobName: string;
  jobId?: string;
  reason?: string;
  timestamp: Date;
  attemptsRemaining?: number;
}

/**
 * Send alert for job failure.
 *
 * Current implementation: Console logging with clear ERROR markers
 * Production implementation: Integrate with Slack, email, or PagerDuty
 *
 * @param alert - Alert details
 */
async function sendAlert(alert: Alert): Promise<void> {
  // Log to console (in production, would send to Slack/email/PagerDuty)
  console.error('========================================');
  console.error('ALERT: Job Failure');
  console.error(`Job: ${alert.jobName}`);
  console.error(`Reason: ${alert.reason}`);
  console.error(`Time: ${alert.timestamp.toISOString()}`);
  console.error(`Retries remaining: ${alert.attemptsRemaining || 0}`);
  console.error('Action: Monitoring for automatic retry...');
  console.error('========================================');

  // TODO: Integrate with actual alerting system (Slack, email, etc.)
  // Example: await sendSlackMessage(webhookUrl, alertMessage);
}

/**
 * Format health report as human-readable string.
 *
 * @param statuses - Array of job health statuses
 * @returns Formatted health report
 */
export function formatHealthReport(statuses: JobHealthStatus[]): string {
  let report = 'Job Health Report\n';
  report += '='.repeat(60) + '\n\n';

  for (const status of statuses) {
    const icon = status.lastStatus === 'completed' ? '✓' :
                 status.lastStatus === 'failed' ? '✗' : '○';

    report += `${icon} ${status.jobName}\n`;
    report += `  Last run: ${status.lastRun?.toISOString() || 'never'}\n`;
    report += `  Status: ${status.lastStatus}\n`;
    report += `  Success/Fail: ${status.successCount}/${status.failureCount}\n`;
    report += `  Avg duration: ${(status.avgDuration / 1000).toFixed(1)}s\n`;
    report += '\n';
  }

  return report;
}

/**
 * Get queue metrics.
 *
 * Provides counts for:
 * - Waiting jobs (not yet started)
 * - Active jobs (currently processing)
 * - Completed jobs (successful)
 * - Failed jobs (all retries exhausted)
 *
 * @returns Object with queue metrics
 */
export async function getQueueMetrics() {
  const waiting = await crawlQueue.getWaitingCount();
  const active = await crawlQueue.getActiveCount();
  const completed = await crawlQueue.getCompletedCount();
  const failed = await crawlQueue.getFailedCount();

  return { waiting, active, completed, failed };
}
