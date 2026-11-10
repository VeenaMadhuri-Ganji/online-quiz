export type Question = { id: string; text: string; options: string[]; correct: number };
export type Quiz = { id: string; title: string; maxAttempts: number; questions: Question[] };
export type Attempt = {
  id: string;
  quizId: string;
  student: string;
  answers: number[];
  score: number;
  total: number;
  at: number;
};
export type Store = { quizzes: Quiz[]; attempts: Attempt[] };

export const uid = () => Math.random().toString(36).slice(2, 10);

export function scoreAnswers(quiz: Quiz, answers: number[]) {
  const score = quiz.questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0);
  return { score, total: quiz.questions.length };
}

const norm = (s: string) => s.trim().toLowerCase();

export function attemptsFor(store: Store, quizId: string, student: string) {
  return store.attempts.filter((a) => a.quizId === quizId && norm(a.student) === norm(student));
}

export function canAttempt(store: Store, quiz: Quiz, student: string) {
  return attemptsFor(store, quiz.id, student).length < quiz.maxAttempts;
}

/** Appends a new attempt (never replaces). Throws if the limit is reached. */
export function submitAttempt(store: Store, quiz: Quiz, student: string, answers: number[], at = Date.now()): Store {
  if (!student.trim()) throw new Error("Enter your name");
  if (!canAttempt(store, quiz, student)) throw new Error("Attempt limit reached");
  const { score, total } = scoreAnswers(quiz, answers);
  const attempt: Attempt = { id: uid(), quizId: quiz.id, student: student.trim(), answers, score, total, at };
  return { ...store, attempts: [...store.attempts, attempt] };
}

const KEY = "quizdesk-v1";
export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { quizzes: [], attempts: [] };
}
export function save(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
