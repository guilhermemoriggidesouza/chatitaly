import { lessonQueue, LessonJobData, LessonJobResult } from '../queues/lesson';
import { LLMService } from '../../infra/llm';
import { mongoDb } from '../../infra/mongodb';
import logger from '../../logger';
import { v4 as uuidv4 } from 'uuid';
import { generateLessonHash } from '../../utils/hash';
import { extractChapterText, generateLessonMarkdown } from '../../services/lesson-generator';
import { LESSON_THEMES_SYSTEM_PROMPT, LessonThemesSchema, LessonThemesType } from '../../prompts/lesson-themes';
import { Lesson } from '../../infra/models/lesson';
import { ragService } from '../../services/rag-service';

const NUM_WORKERS = process.env.NUM_WORKERS ? parseInt(process.env.NUM_WORKERS) : 5;

async function processLesson(jobData: LessonJobData): Promise<LessonJobResult> {
  try {
    logger.info(
      { lessonId: jobData.lessonId, userId: jobData.userId, title: jobData.title },
      'Processing lesson'
    );
    const lessonHash = generateLessonHash(jobData.title);
    // Filtra pelo lessonId (único). O lessonHash não é mais único: dois livros
    // podem ter um capítulo com o mesmo título.
    let lesson = await mongoDb.findOne('lessons', { lessonId: jobData.lessonId });

    //REPROCESSAMENTO OFF
    // if (lesson && lesson.status === 'PROCESSED') {
    //   logger.info(
    //     { lessonId: jobData.lessonId, existingLessonId: lesson.lessonId, lessonHash },
    //     'Lesson already processed, skipping'
    //   );

    //   return {
    //     lessonId: lesson.lessonId,
    //     status: 'completed',
    //     data: {
    //       fileUri: lesson.fileUri,
    //       title: lesson.title,
    //       pages: lesson.pages,
    //       pagesProcessed: 0,
    //       lessonContent: lesson.lessonContent,
    //       message: 'Lesson was already processed'
    //     },
    //   };
    // }

    //REPROCESSAMENTO ON
    await mongoDb.updateOne(
      'lessons',
      { lessonId: jobData.lessonId },
      { $set: { status: 'PENDING' } }
    );

    if (!lesson) {
      throw new Error("We dont find the lesson")
    }
    const chapterText = await extractChapterText(lesson as unknown as Lesson);
    logger.info({ lessonId: lesson.lessonId, lessonHash }, 'Extracted PDF content');

    const lessonMarkdown = await generateLessonMarkdown(lesson as unknown as Lesson, chapterText);

    // Temas + descrição curta de cada um, tirados da lição pronta (já revisada).
    const themesResponse = await new LLMService().generatedStructure<LessonThemesType>(
      LESSON_THEMES_SYSTEM_PROMPT,
      lessonMarkdown,
      LessonThemesSchema,
    );

    if (!themesResponse.success || !themesResponse.data?.themes.length) {
      throw new Error(`Failed to extract lesson themes: ${themesResponse.error}`);
    }

    const lessonData = {
      lesson: lessonMarkdown,
      themes: themesResponse.data.themes,
    };

    logger.info(
      { lessonHash, themesCount: lessonData.themes.length },
      'Lesson generated successfully'
    );

    // Update lesson status in MongoDB using lessonHash with generated content
    await mongoDb.updateOne(
      'lessons',
      { lessonId: jobData.lessonId },
      {
        $set: {
          status: 'PROCESSED',
          lessonContent: lessonData.lesson,
          updatedAt: new Date().toISOString()
        }
      }
    );

    for (const { italianName: theme, description } of lessonData.themes) {
      await mongoDb.insertOne('themes', {
        themeId: uuidv4(),
        lessonId: lesson.lessonId,
        theme,
        description,
        createdAt: new Date().toISOString()
      });
    }

    // RAG de lição: indexa o `lessonContent` (já limpo, sem ruído de PDF) pro
    // plain-node/conversational-node buscarem contexto do tema atual. Não
    // trava o processamento se falhar (Neo4j fora, etc.).
    try {
      await ragService.ingest(lesson.lessonId, lessonData.lesson);
    } catch (ragError: any) {
      logger.warn({ lessonId: lesson.lessonId, error: ragError.message }, 'RAG de lição falhou, seguindo sem isso');
    }

    logger.info({ lessonHash, themesCount: lessonData.themes.length }, 'Lesson processed and updated in MongoDB');

    return {
      lessonId: lesson.lessonId,
      status: 'completed',
      data: {
        fileUri: lesson.fileUri,
        title: lesson.title,
        pages: lesson.pages,
        pagesProcessed: (lesson.pages?.length ?? 0),
        lessonContent: lessonData.lesson,
        themes: lessonData.themes,
        lessonHash
      },
    };
  } catch (error: any) {
    logger.error(
      { lessonId: jobData.lessonId, error: error.message },
      'Error processing lesson'
    );

    // Update lesson status with error
    try {
      await mongoDb.updateOne(
        'lessons',
        { lessonId: jobData.lessonId },
        { $set: { status: 'ERROR_PROCESSING', error: error.message, updatedAt: new Date().toISOString() } }
      );
    } catch (updateError: any) {
      logger.error({ lessonId: jobData.lessonId, error: updateError.message }, 'Failed to update lesson error status');
    }

    return {
      lessonId: jobData.lessonId,
      status: 'failed',
      error: error.message,
    };
  }
}

export async function registerWorker() {
  try {
    logger.info({ numWorkers: NUM_WORKERS }, 'Registering lesson queue processor');

    // Register processor with concurrency settings
    lessonQueue.process(NUM_WORKERS, async (job) => {
      try {
        const result = await processLesson(job.data);

        if (result.status === 'failed') {
          throw new Error(result.error);
        }

        job.progress(100);
        return result;
      } catch (error: any) {
        logger.error({ jobId: job.id, error: error.message }, 'Job processing failed');
        throw error;
      }
    });

    logger.info({ numWorkers: NUM_WORKERS }, 'Processor registered and listening for jobs');
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to register worker');
    throw error;
  }
}

export { processLesson };
