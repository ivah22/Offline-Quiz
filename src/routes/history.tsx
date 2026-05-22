import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { ArrowLeft, Trophy, TrendingUp, ListChecks } from "lucide-react";
import { db } from "@/lib/db";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const attempts = useLiveQuery(
    () => db.attempts.orderBy("completedAt").reverse().toArray(),
    [],
  );
  const quizzes = useLiveQuery(() => db.quizzes.toArray(), []);

  const stats = useMemo(() => {
    if (!attempts || !attempts.length) return { highest: 0, average: 0, count: 0 };
    const highest = Math.max(...attempts.map((a) => a.percentage));
    const average = Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length);
    return { highest, average, count: attempts.length };
  }, [attempts]);

  const quizMap = useMemo(() => {
    const m = new Map<number, string>();
    quizzes?.forEach((q) => q.id && m.set(q.id, q.title));
    return m;
  }, [quizzes]);

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Library
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Quiz History</h1>
        <p className="text-sm text-muted-foreground">{stats.count} attempts saved offline</p>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6">
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Trophy className="size-3.5" /> Highest</div>
            <p className="mt-1 text-2xl font-bold">{stats.highest}%</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="size-3.5" /> Average</div>
            <p className="mt-1 text-2xl font-bold">{stats.average}%</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ListChecks className="size-3.5" /> Total</div>
            <p className="mt-1 text-2xl font-bold">{stats.count}</p>
          </div>
        </section>

        <ul className="mt-6 space-y-3">
          {attempts?.length === 0 && (
            <li className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              No attempts yet. Take a quiz to start tracking progress.
            </li>
          )}
          {attempts?.map((a) => {
            const color = a.passed ? "text-success" : "text-destructive";
            return (
              <li key={a.id} className="rounded-2xl border bg-card p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl font-bold tabular-nums ${
                    a.passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}>{a.percentage}%</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.quizTitle || quizMap.get(a.quizId) || "Quiz"}</p>
                    <p className="text-xs text-muted-foreground">
                      Taken by <span className="font-medium text-foreground">{a.takenByName ?? "Unknown"}</span> · {new Date(a.completedAt).toLocaleString()}
                    </p>
                    <p className={`text-xs font-medium ${color}`}>
                      {a.score}/{a.total} correct · {a.points}/{a.maxPoints} pts · {a.passed ? "Passed" : "Failed"}
                    </p>
                  </div>

                  <Link to="/results/$attemptId" params={{ attemptId: String(a.id) }}
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-soft">
                    Review
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
