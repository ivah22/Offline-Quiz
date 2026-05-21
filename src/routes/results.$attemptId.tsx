import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export const Route = createFileRoute("/results/$attemptId")({ component: Results });

function Results() {
  const { attemptId } = Route.useParams();
  const attempt = useLiveQuery(() => db.attempts.get(Number(attemptId)), [attemptId]);
  const quiz = useLiveQuery(
    async () => (attempt ? db.quizzes.get(attempt.quizId) : undefined),
    [attempt?.quizId],
  );

  if (!attempt || !quiz) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  const pct = attempt.percentage;
  const grade =
    pct >= 90 ? "Excellent" : pct >= 75 ? "Great" : pct >= 60 ? "Good" : pct >= 40 ? "Keep trying" : "Needs work";
  const accent =
    pct >= 75 ? "text-success" : pct >= 50 ? "text-primary" : "text-destructive";

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Library
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6">
        <div className="rounded-3xl bg-gradient-primary p-8 text-center text-primary-foreground shadow-soft">
          <p className="text-sm font-medium opacity-90">{quiz.title}</p>
          <p className="mt-6 text-7xl font-bold tabular-nums">{pct}%</p>
          <p className="mt-2 text-lg opacity-95">{grade}</p>
          <p className="mt-4 text-sm opacity-90">
            {attempt.score} of {attempt.total} correct
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            to="/quiz/$id"
            params={{ id: String(quiz.id) }}
            className="rounded-2xl bg-card py-4 text-center font-medium shadow-card"
          >
            Retry
          </Link>
          <Link
            to="/"
            className="rounded-2xl bg-card py-4 text-center font-medium shadow-card"
          >
            Done
          </Link>
        </div>

        <h3 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Answer Review
        </h3>
        <ul className="space-y-3">
          {quiz.questions.map((q, i) => {
            const given = attempt.answers[i];
            const correct = given === q.correct;
            return (
              <li
                key={i}
                className={`rounded-2xl border-l-4 bg-card p-4 shadow-card ${
                  correct ? "border-l-success" : "border-l-destructive"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                      correct
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {correct ? "✓" : "✕"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Q{i + 1}</p>
                    <p className="font-medium leading-snug">{q.question}</p>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <p>
                        <span className="text-muted-foreground">Your answer: </span>
                        <span className={correct ? "text-success font-medium" : "text-destructive font-medium"}>
                          {given ?? "—"}
                        </span>
                      </p>
                      {!correct && (
                        <p>
                          <span className="text-muted-foreground">Correct: </span>
                          <span className="font-medium text-success">{q.correct}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
