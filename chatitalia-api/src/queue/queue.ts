import Queue from 'bull';
import logger from '../logger';

export interface LessonJobData {
    lessonId: string;
    userId: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
}

export interface LessonJobResult {
    lessonId: string;
    status: 'completed' | 'failed';
    data?: any;
    error?: string;
}

export const lessonQueue = new Queue<LessonJobData>('lessons', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    settings: {
        maxStalledCount: 2,
        lockDuration: 15000,
        lockRenewTime: 5000,
    },
});

export async function addLessonJob(data: LessonJobData, priority?: number) {
    try {
        const job = await lessonQueue.add(data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
            priority: priority || 0,
            timeout: 600000, // 10 minutes
        });

        logger.info({ jobId: job.id, lessonId: data.lessonId }, 'Job added');
        return job;
    } catch (error: any) {
        logger.error({ error: error.message }, 'Error adding job');
        throw error;
    }
}

// Queue event listeners
lessonQueue.on('error', (error) => {
    logger.error({ error }, 'Queue error');
});

lessonQueue.on('stalled', (job) => {
    logger.warn({ jobId: job.id }, 'Job stalled');
});

lessonQueue.on('failed', (job, error) => {
    logger.error(
        { jobId: job.id, attempts: job.attemptsMade, error: error.message },
        'Job failed'
    );
});

lessonQueue.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed');
});

export async function getLessonJobStatus(jobId: string) {
    try {
        const job = await lessonQueue.getJob(jobId);
        if (!job) {
            return null;
        }

        const progress = job.progress();
        const state = await job.getState();

        return {
            id: job.id,
            state,
            progress,
            data: job.data,
            result: job.returnvalue,
            failedReason: job.failedReason,
            attempts: job.attemptsMade,
        };
    } catch (error: any) {
        logger.error({ error: error.message }, 'Error getting job status');
        throw error;
    }
}

export default lessonQueue;
