import Queue from 'bull';

export interface LessonJobData {
    lessonId: string;
    userId: string;
    level: string;
    theme: string;
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

        console.log(`[Queue Info] Job ${job.id} added for lesson ${data.lessonId}`);
        return job;
    } catch (error: any) {
        console.error('[Queue Error] Error adding job:', error.message);
        throw error;
    }
}

// Queue event listeners
lessonQueue.on('error', (error) => {
    console.error('[Queue Error]', error);
});

lessonQueue.on('stalled', (job) => {
    console.warn(`[Queue Warn] Job stalled - ${job.id}`);
});

lessonQueue.on('failed', (job, error) => {
    console.error(
        `[Queue Error] Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`
    );
});

lessonQueue.on('completed', (job) => {
    console.log(`[Queue Info] Job ${job.id} completed`);
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
        console.error('[Queue Error] Error getting job status:', error.message);
        throw error;
    }
}

export default lessonQueue;
