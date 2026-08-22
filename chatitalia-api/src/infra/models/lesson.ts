export type Lesson = {
  lessonId: string;
  lessonHash: string;
  bookId: string;
  title: string;
  fileUri: string;
  pages: number[];
  userId: string;
  status: 'PROCESSED' | string; // Pode ser restrito para 'PROCESSED' | 'PENDING' | 'ERROR'
  createdAt: string; // Ou Date, caso o objeto seja instanciado em memória
  updatedAt: string; // Ou Date
  lessonContent: string;
};