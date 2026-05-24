import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Download, FileText, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { exportResultsToExcel, exportResultsToPDF, printResults } from "@/lib/export";

export default function ResultsPage() {
  const { attemptId } = useParams();
  const attempt = useLiveQuery(() => db.attempts.get(Number(attemptId)), [attemptId]);
  const quiz = useLiveQuery(
    async () => (attempt ? db.quizzes.get(attempt.quizId) : undefined),
    [attempt?.quizId],
  );

  if (!attempt || !quiz) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading...</div>;
  }

  const pct = attempt.percentage;
  const grade = pct >= 90 ? "Excellent" : pct >= 75 ? "Great" : pct >= 60 ? "Good" : pct >= 40 ? "Keep trying" : "Needs work";

  return (
    <div className="min-h-screen pb-16 print:bg-white">
      <header className="mx-auto max-w-2xl px-5 pt-8 print:hidden">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Library
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6">
        <div className={`rounded-3xl p-8 text-center text-primary-foreground shadow-soft ${
          attempt.passed ? "bg-gradient-primary" : "bg-destructive"
        }`}>
          <p className="text-sm font-medium opacity-90">{quiz.title}</p>
          <p className="mt-6 text-7xl font-bold tabular-nums">{pct}%</p>
          <p className="mt-2 text-lg opacity-95">{grade} · {attempt.passed ? "Passed" : "Failed"}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs opacity-90">
            <div><p className="text-lg font-bold">{attempt.score}/{attempt.total}</p><p>Correct</p></div>
            <div><p className="text-lg font-bold">{attempt.points}/{attempt.maxPoints}</p><p>Points</p></div>
            <div><p className="text-lg font-bold">{attempt.durationSec}s</p><p>Time</p></div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
          <Link to={`/quiz/${quiz.id}`}
            className="rounded-2xl bg-card py-3 text-center text-sm font-medium shadow-card">Retry</Link>
          <Link to="/history"
            className="rounded-2xl bg-card py-3 text-center text-sm font-medium shadow-card">History</Link>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 print:hidden">
          <button onClick={() => exportResultsToExcel(attempt, quiz)}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border bg-card py-3 text-xs font-medium shadow-card hover:bg-accent">
            <Download className="size-3.5" /> Excel
          </button>
          <button onClick={() => exportResultsToPDF(attempt, quiz)}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border bg-card py-3 text-xs font-medium shadow-card hover:bg-accent">
            <FileText className="size-3.5" /> PDF
          </button>
          <button onClick={printResults}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border bg-card py-3 text-xs font-medium shadow-card hover:bg-accent">
            <Printer className="size-3.5" /> Print
          </button>
        </div>

        <h3 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Answer Review</h3>
        <ul className="space-y-3">
          {attempt.questionOrder.map((qi, i) => {
            const q = quiz.questions[qi];
            const given = attempt.answers[i];
            const correct = given === q.correct;
            return (
              <li key={i} className={`rounded-2xl border-l-4 bg-card p-4 shadow-card ${
                correct ? "border-l-success" : "border-l-destructive"
              }`}>
                <div className="flex items-start gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                    correct ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}>{correct ? "✓" : "✕"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Q{i + 1}{q.category ? ` · ${q.category}` : ""}</p>
                    <p className="font-medium leading-snug">{q.question}</p>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <p>
                        <span className="text-muted-foreground">Your answer: </span>
                        <span className={correct ? "text-success font-medium" : "text-destructive font-medium"}>{given ?? "—"}</span>
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
