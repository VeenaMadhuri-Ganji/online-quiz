import { describe, it, expect } from "vitest";
import { scoreAnswers, submitAttempt, type Quiz, type Store } from "@/lib/quiz";

const quiz: Quiz = {
  id: "q1",
  title: "T",
  maxAttempts: 2,
  questions: [
    { id: "a", text: "1", options: ["x", "y"], correct: 1 },
    { id: "b", text: "2", options: ["x", "y"], correct: 0 },
  ],
};
const empty: Store = { quizzes: [quiz], attempts: [] };

describe("quiz rules", () => {
  it("scores correct answers", () => {
    expect(scoreAnswers(quiz, [1, 1])).toEqual({ score: 1, total: 2 });
  });
  it("blocks attempts beyond the limit", () => {
    let s = submitAttempt(empty, quiz, "Ann", [1, 0]);
    s = submitAttempt(s, quiz, "ann ", [0, 0]);
    expect(() => submitAttempt(s, quiz, "Ann", [1, 0])).toThrow("Attempt limit reached");
  });
  it("keeps previous attempts", () => {
    let s = submitAttempt(empty, quiz, "Ann", [1, 0]);
    s = submitAttempt(s, quiz, "Ann", [0, 1]);
    expect(s.attempts.map((a) => a.score)).toEqual([2, 0]);
  });
});
