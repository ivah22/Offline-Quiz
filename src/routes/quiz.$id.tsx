import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export const Route = createFileRoute("/quiz/$id")({ component: QuizPage });

function QuizPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const quiz = useLiveQuery(() => db.quizzes.get(Number(id)), [id]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (quiz) setAnswers(Array(quiz.questions.length).fill(null));
  }, [quiz?.id, quiz?.questions.length]);

  const progress = useMemo(() => {
    if (!quiz) return 0;
    return ((idx + 1) / quiz.questions.length) * 100;
  }, [idx, quiz]);

  if (!quiz) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  const q = quiz.questions[idx];
  const isLast = idx === quiz.questions.length - 1;
  const allAnswered = answers.every((a) => a !== null);

  function pick(choice: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = choice;
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    let score = 0;
    quiz!.questions.forEach((qq, i) => {
      if (answers[i] === qq.correct) score++;
    });
    const total = quiz!.questions.length;
    const attemptId = await db.attempts.add({
      quizId: quiz!.id!,
      answers,
      score,
      total,
      percentage: Math.round((score / total) * 100),
      completedAt: Date.now(),
    });
    navigate({ to: "/results/$attemptId", params: { attemptId: String(attemptId) } });
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link
            to="/"
            className="rounded-full border bg-card p-2 text-sm shadow-card"
            aria-label="Back"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{quiz.title}</p>
            <p className="text-sm font-semibold">
              Question {idx + 1} <span className="text-muted-foreground">/ {quiz.questions.length}</span>
            </p>
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-gradient-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-8">
        <div className="rounded-3xl bg-card p-6 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Question
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug">{q.question}</h2>

          <div className="mt-6 space-y-3">
            {q.choices.map((c, i) => {
              const selected = answers[idx] === c;
              return (
                <button
                  key={i}
                  onClick={() => pick(c)}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition active:scale-[0.98] ${
                    selected
                      ? "border-primary bg-accent shadow-soft"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                      selected
                        ? "bg-gradient-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {"ABCD"[i]}
                  </span>
                  <span className="flex-1 font-medium">{c}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3 px-5 py-4">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex-1 rounded-2xl border bg-card py-3.5 font-medium shadow-card disabled:opacity-40"
          >
            Previous
          </button>
          {isLast ? (
            <button
              onClick={submit}
              disabled={!allAnswered || submitting}
              className="flex-[1.4] rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              {submitting ? "Saving..." : allAnswered ? "Submit Quiz" : `Answer all (${answers.filter(a => a).length}/${answers.length})`}
            </button>
          ) : (
            <button
              onClick={() => setIdx((i) => Math.min(quiz.questions.length - 1, i + 1))}
              disabled={answers[idx] === null}
              className="flex-[1.4] rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-soft disabled:opacity-50"
            >
              Next →
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
