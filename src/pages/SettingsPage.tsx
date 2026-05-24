import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { useSettings, setSettings, defaultSettings } from "@/lib/settings";
import { changeAdminPassword, useSession } from "@/lib/auth";
import { sfx } from "@/lib/sound";

export default function SettingsPage() {
  const s = useSettings();
  const { session } = useSession();


  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Library
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure how every quiz behaves.</p>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6 space-y-3">
        <Group title="Appearance">
          <Toggle label="Dark mode" checked={s.theme === "dark"}
            onChange={(v) => setSettings({ theme: v ? "dark" : "light" })} />
        </Group>

        <Group title="Timer">
          <Toggle label="Timer enabled" checked={s.timerEnabled}
            onChange={(v) => setSettings({ timerEnabled: v })} />
          <Row label="Seconds per question">
            <NumberInput min={5} max={600} value={s.secondsPerQuestion}
              onChange={(v) => setSettings({ secondsPerQuestion: v })} />
          </Row>
        </Group>

        <Group title="Question delivery">
          <Toggle label="Randomize question order" checked={s.shuffleQuestions}
            onChange={(v) => setSettings({ shuffleQuestions: v })} />
          <Toggle label="Randomize choice order" checked={s.shuffleChoices}
            onChange={(v) => setSettings({ shuffleChoices: v })} />
          <Row label="Limit number of questions (0 = no limit)">
            <NumberInput min={0} max={500} value={s.questionLimit}
              onChange={(v) => setSettings({ questionLimit: v })} />
          </Row>
        </Group>

        <Group title="Grading">
          <Row label="Passing score (%)">
            <NumberInput min={0} max={100} value={s.passingScore}
              onChange={(v) => setSettings({ passingScore: v })} />
          </Row>
          <Toggle label="Show answer immediately"
            checked={s.showAnswerImmediately}
            onChange={(v) => setSettings({ showAnswerImmediately: v })} />
        </Group>

        <Group title="Sound">
          <Toggle label="Sound effects" checked={s.soundEffects}
            onChange={(v) => { setSettings({ soundEffects: v }); if (v) sfx.correct(); }} />
        </Group>

        {session?.role === "admin" && <AdminPasswordCard />}

        <button onClick={() => setSettings(defaultSettings)}
          className="w-full rounded-2xl border bg-card py-3 text-sm font-medium shadow-card hover:bg-accent">
          Reset to defaults
        </button>
      </main>
    </div>
  );
}

function AdminPasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) { setMsg({ type: "err", text: "New passwords do not match" }); return; }
    setBusy(true);
    try {
      await changeAdminPassword(current, next);
      setMsg({ type: "ok", text: "Password updated" });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Failed" });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <KeyRound className="size-3.5" /> Change admin password
      </p>
      <PwdField label="Current password" value={current} onChange={setCurrent} />
      <PwdField label="New password" value={next} onChange={setNext} />
      <PwdField label="Confirm new password" value={confirm} onChange={setConfirm} />
      {msg && (
        <p className={`rounded-xl px-3 py-2 text-xs ${msg.type === "ok" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy}
        className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60">
        {busy ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

function PwdField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} required
        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
    </label>
  );
}


function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={(e) => onChange(Math.max(min ?? 0, Math.min(max ?? 9999, Number(e.target.value) || 0)))}
      className="w-24 rounded-xl border bg-background px-3 py-1.5 text-right text-sm outline-none focus:border-primary" />
  );
}
