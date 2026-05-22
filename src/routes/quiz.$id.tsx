import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Clock, Tag, Trophy, Target, Hash } from "lucide-react";
import { db, quizDifficulty, quizTotalPoints, type Quiz } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { shuffle } from "@/lib/shuffle";
import { sfx } from "@/lib/sound";

export const Route = createFileRoute("/quiz/$id")({ component: QuizPage });

function QuizPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const settings = useSettings();
  const quiz = useLiveQuery(() => db.quizzes.get(Number(id)), [id]);
  const [started, setStarted] = useState(false);

  if (!quiz) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading...</div>;
  }
  if (!started) return <Preview quiz={quiz} onStart={() => setStarted(true)} />;
  return <QuizRunner quiz={quiz} settings={settings} onCancel={() => navigate({ to: "/" })} />;
}

function Preview({ quiz, onStart }: { quiz: Quiz; onStart: () => void }) {
  const settings = useSettings();
  const totalPoints = quizTotalPoints(quiz);
  const diff = quizDifficulty(quiz);
  const count = settings.questionLimit > 0
    ? Math.min(settings.questionLimit, quiz.questions.length)
    : quiz.questions.length;
  const estSec = (settings.timerEnabled ? settings.secondsPerQuestion : 45) * count;
  const minutes = Math.max(1, Math.round(estSec / 60));

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Library
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-5 pt-6">
        <div className="rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-soft">
          <p className="text-xs uppercase tracking-wider opacity-80">Ready to start</p>
          <h1 className="mt-2 text-3xl font-bold">{quiz.title}</h1>
          {quiz.category && <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs"><Tag className="size-3" />{quiz.category}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat icon={Hash} label="Questions" value={String(count)} sub={count < quiz.questions.length ? `of ${quiz.questions.length}` : undefined} />
          <Stat icon={Trophy} label="Total points" value={String(totalPoints)} />
          <Stat icon={Clock} label="Est. time" value={`${minutes} min`} />
          <Stat icon={Target} label="Difficulty" value={diff} />
        </div>

        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-card text-xs space-y-1 text-muted-foreground">
          <p><strong className="text-foreground">Passing score:</strong> {settings.passingScore}%</p>
          <p><strong className="text-foreground">Timer:</strong> {settings.timerEnabled ? `${settings.secondsPerQuestion}s per question` : "Off"}</p>
          <p><strong className="text-foreground">Questions:</strong> {settings.shuffleQuestions ? "Shuffled" : "Original order"}</p>
          <p><strong className="text-foreground">Choices:</strong> {settings.shuffleChoices ? "Shuffled" : "Original order"}</p>
          <p><strong className="text-foreground">Feedback:</strong> {settings.showAnswerImmediately ? "Immediate" : "After exam"}</p>
        </div>

        <button onClick={onStart}
          className="mt-5 w-full rounded-2xl bg-gradient-primary py-4 text-base font-semibold text-primary-foreground shadow-soft active:scale-[0.98]">
          Start quiz
        </button>
        <Link to="/settings" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">
          Adjust settings →
        </Link>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" /> {label}</div>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function QuizRunner({
  quiz, settings, onCancel,
}: { quiz: Quiz; settings: ReturnType<typeof useSettings>; onCancel: () => void }) {
  const navigate = useNavigate();
  const startedAt = useRef(Date.now());

  const order = useMemo(() => {
    let idxs = quiz.questions.map((_, i) => i);
    if (settings.shuffleQuestions) idxs = shuffle(idxs);
    if (settings.questionLimit > 0) idxs = idxs.slice(0, settings.questionLimit);
    return idxs;
  }, [quiz.id, settings.shuffleQuestions, settings.questionLimit]);

  const choiceOrder = useMemo(
    () => order.map((qi) => {
      const positions = [0, 1, 2, 3];
      return settings.shuffleChoices ? shuffle(positions) : positions;
    }),
    [order, settings.shuffleChoices],
  );

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(() => Array(order.length).fill(null));
  const [revealed, setRevealed] = useState<boolean[]>(() => Array(order.length).fill(false));
  const [secondsLeft, setSecondsLeft] = useState(settings.secondsPerQuestion);
  const [submitting, setSubmitting] = useState(false);

  const currentQ = quiz.questions[order[idx]];
  const currentChoices = choiceOrder[idx].map((p) => currentQ.choices[p]);
  const isLast = idx === order.length - 1;

  useEffect(() => { if (settings.timerEnabled) setSecondsLeft(settings.secondsPerQuestion); }, [idx, settings.timerEnabled, settings.secondsPerQuestion]);

  useEffect(() => {
    if (!settings.timerEnabled) return;
    if (settings.showAnswerImmediately && revealed[idx]) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (settings.soundEffects) sfx.tick();
          handleAdvance();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, settings.timerEnabled, revealed[idx]]);

  function pick(choice: string) {
    if (settings.soundEffects) sfx.click();
    setAnswers((prev) => { const n = [...prev]; n[idx] = choice; return n; });
    if (settings.showAnswerImmediately) {
      setRevealed((prev) => { const n = [...prev]; n[idx] = true; return n; });
      if (settings.soundEffects) {
        choice === currentQ.correct ? sfx.correct() : sfx.wrong();
      }
    }
  }

  function handleAdvance() {
    if (isLast) submit();
    else setIdx((i) => i + 1);
  }

  async function submit() {
    setSubmitting(true);
    let score = 0;
    let points = 0;
    let maxPoints = 0;
    order.forEach((qi, i) => {
      const q = quiz.questions[qi];
      const p = q.points ?? 1;
      maxPoints += p;
      if (answers[i] === q.correct) { score++; points += p; }
    });
    const total = order.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= settings.passingScore;
    if (settings.soundEffects) sfx.finish();
    const attemptId = await db.attempts.add({
      quizId: quiz.id!,
      quizTitle: quiz.title,
      questionOrder: order,
      answers,
      score,
      total,
      points,
      maxPoints,
      percentage,
      passed,
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
      completedAt: Date.now(),
    });
    navigate({ to: "/results/$attemptId", params: { attemptId: String(attemptId) } });
  }

  const progress = ((idx + 1) / order.length) * 100;
  const allAnswered = answers.every((a) => a !== null);
  const revealedNow = settings.showAnswerImmediately && revealed[idx];

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
          <button onClick={onCancel} className="rounded-full border bg-card p-2 shadow-card" aria-label="Exit">
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{quiz.title}</p>
            <p className="text-sm font-semibold">Question {idx + 1} <span className="text-muted-foreground">/ {order.length}</span></p>
          </div>
          {settings.timerEnabled && (
            <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
              secondsLeft <= 10 ? "bg-destructive/15 text-destructive" : "bg-accent text-accent-foreground"
            }`}>
              <Clock className="size-3" /> {secondsLeft}s
            </div>
          )}
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-8">
        <div className="rounded-3xl bg-card p-6 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Question</p>
          <h2 className="mt-2 text-xl font-semibold leading-snug">{currentQ.question}</h2>

          <div className="mt-6 space-y-3">
            {currentChoices.map((c, i) => {
              const selected = answers[idx] === c;
              const isCorrect = c === currentQ.correct;
              let cls = "border-border bg-card hover:border-primary/40";
              if (revealedNow) {
                if (isCorrect) cls = "border-success bg-success/10";
                else if (selected) cls = "border-destructive bg-destructive/10";
              } else if (selected) {
                cls = "border-primary bg-accent shadow-soft";
              }
              return (
                <button key={i} disabled={revealedNow}
                  onClick={() => pick(c)}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition active:scale-[0.98] disabled:cursor-default ${cls}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                    revealedNow && isCorrect ? "bg-success text-success-foreground" :
                    revealedNow && selected ? "bg-destructive text-destructive-foreground" :
                    selected ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>{"ABCD"[i]}</span>
                  <span className="flex-1 font-medium">{c}</span>
                </button>
              );
            })}
          </div>

          {revealedNow && answers[idx] !== currentQ.correct && (
            <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm">
              <span className="font-semibold text-success">Correct:</span> {currentQ.correct}
            </p>
          )}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3 px-5 py-4">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
            className="flex-1 rounded-2xl border bg-card py-3.5 font-medium shadow-card disabled:opacity-40">
            Previous
          </button>
          {isLast ? (
            <button onClick={submit} disabled={!allAnswered || submitting}
              className="flex-[1.4] rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-soft disabled:opacity-50">
              {submitting ? "Saving..." : allAnswered ? "Submit Quiz" : `Answer all (${answers.filter((a) => a).length}/${answers.length})`}
            </button>
          ) : (
            <button onClick={() => setIdx((i) => Math.min(order.length - 1, i + 1))}
              disabled={answers[idx] === null}
              className="flex-[1.4] rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-soft disabled:opacity-50">
              Next →
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
