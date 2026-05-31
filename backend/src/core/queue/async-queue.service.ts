import { Injectable, Logger } from '@nestjs/common';

export type JobProcessor<T = any> = (data: T) => Promise<void>;

interface QueuedJob<T = any> {
  id: string;
  name: string;
  data: T;
  attempts: number;
}

interface QueueOptions {
  maxAttempts?: number;
  /** base backoff in ms; grows linearly per attempt */
  backoffMs?: number;
}

/**
 * Lightweight in-process async job queue (memory fallback for BullMQ).
 *
 * Producers call `enqueue()` which returns immediately — the job is processed
 * on the next tick by the registered processor, off the request lifecycle.
 * Failed jobs are retried with linear backoff up to maxAttempts.
 *
 * This keeps webhook/HTTP handlers free to return in milliseconds while the
 * real work happens in the background. If a Redis-backed BullMQ is introduced
 * later, the same enqueue()/process() surface can be swapped behind this class.
 */
@Injectable()
export class AsyncQueueService {
  private readonly logger = new Logger(AsyncQueueService.name);
  private readonly processors = new Map<string, JobProcessor>();
  private readonly options = new Map<string, Required<QueueOptions>>();
  private seq = 0;

  /** Register the worker for a named queue. */
  process<T = any>(
    name: string,
    processor: JobProcessor<T>,
    options: QueueOptions = {},
  ): void {
    this.processors.set(name, processor as JobProcessor);
    this.options.set(name, {
      maxAttempts: options.maxAttempts ?? 5,
      backoffMs: options.backoffMs ?? 2000,
    });
    this.logger.log(`Registered processor for queue "${name}"`);
  }

  /**
   * Add a job. Returns synchronously (fire-and-forget) — the caller is never
   * blocked by job execution. Safe to call inside an HTTP handler before
   * returning a response.
   */
  enqueue<T = any>(name: string, data: T): string {
    const job: QueuedJob<T> = {
      id: `${name}-${Date.now()}-${++this.seq}`,
      name,
      data,
      attempts: 0,
    };
    // Schedule on the next tick so the current handler returns first.
    setImmediate(() => void this.run(job));
    return job.id;
  }

  private async run(job: QueuedJob): Promise<void> {
    const processor = this.processors.get(job.name);
    if (!processor) {
      this.logger.warn(
        `No processor registered for queue "${job.name}" — dropping job ${job.id}`,
      );
      return;
    }
    const opts = this.options.get(job.name);
    job.attempts++;
    try {
      await processor(job.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (job.attempts < opts.maxAttempts) {
        const delay = opts.backoffMs * job.attempts;
        this.logger.warn(
          `Job ${job.id} failed (attempt ${job.attempts}/${opts.maxAttempts}): ${msg} — retrying in ${delay}ms`,
        );
        setTimeout(() => void this.run(job), delay);
      } else {
        this.logger.error(
          `Job ${job.id} permanently failed after ${opts.maxAttempts} attempts: ${msg}`,
        );
      }
    }
  }
}
