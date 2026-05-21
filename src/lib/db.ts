import Dexie, { type Table } from "dexie";

export interface Question {
  question: string;
  choices: string[]; // 4 items: A,B,C,D
  correct: string;   // the literal correct answer text
}

export interface Quiz {
  id?: number;
  title: string;
  questions: Question[];
  fileData?: Blob;   // original xlsx
  createdAt: number;
}

export interface Attempt {
  id?: number;
  quizId: number;
  answers: (string | null)[];
  score: number;
  total: number;
  percentage: number;
  completedAt: number;
}

class QuizDB extends Dexie {
  quizzes!: Table<Quiz, number>;
  attempts!: Table<Attempt, number>;

  constructor() {
    super("QuizDB");
    this.version(1).stores({
      quizzes: "++id, title, createdAt",
      attempts: "++id, quizId, completedAt",
    });
  }
}

export const db = new QuizDB();
