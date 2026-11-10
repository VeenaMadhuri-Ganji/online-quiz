import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  attemptsFor,
  canAttempt,
  load,
  save,
  submitAttempt,
  uid,
  type Attempt,
  type Question,
  type Quiz,
  type Store,
} from "@/lib/quiz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quizdesk — Pro MCQ quiz tracker" },
      { name: "description", content: "Build multiple-choice quizzes, cap attempts, and track every student score." },
      { property: "og:title", content: "Quizdesk — Pro MCQ quiz tracker" },
      { property: "og:description", content: "Build quizzes, limit attempts, keep every score." },
    ],
  }),
  component: Index,
});

const pct = (a: { score: number; total: number }) => (a.total ? Math.round((a.score / a.total) * 100) : 0);

function Index() {
  const [store, setStore] = useState<Store>({ quizzes: [], attempts: [] });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"teacher" | "student">("teacher");
  useEffect(() => {
    setStore(load());
    setReady(true);
  }, []);
  const update = (s: Store) => {
    setStore(s);
    save(s);
  };
  const avg = store.attempts.length
    ? Math.round(store.attempts.reduce((s, a) => s + pct(a), 0) / store.attempts.length)
    : 0;
  const students = new Set(store.attempts.map((a) => a.student.toLowerCase())).size;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="bg-hero-gradient text-hero-foreground">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-md bg-accent font-display text-lg font-extrabold text-accent-foreground">
                Q
              </div>
              <span className="font-display text-2xl font-extrabold tracking-tight">Quizdesk</span>
            </div>
            <div className="flex rounded-full bg-hero-foreground/10 p-1">
              {(["teacher", "student"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-5 py-1.5 text-sm font-semibold capitalize transition ${tab === t ? "bg-accent text-accent-foreground" : "text-hero-foreground/70 hover:text-hero-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <h1 className="mt-8 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            {tab === "teacher" ? "Teacher dashboard" : "Student portal"}
          </h1>
          <p className="mt-1 text-hero-foreground/70">
            {tab === "teacher" ? "Build quizzes and monitor every attempt." : "Take quizzes and track your progress."}
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-14 max-w-5xl px-4 pb-16">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Quizzes" value={store.quizzes.length} />
          <Stat label="Attempts" value={store.attempts.length} />
          <Stat label="Students" value={students} />
          <Stat label="Avg score" value={`${avg}%`} />
        </div>
        <div className="mt-8">
          {ready &&
            (tab === "teacher" ? <Teacher store={store} update={update} /> : <Student store={store} update={update} />)}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}

type P = { store: Store; update: (s: Store) => void };

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card p-5 shadow-card ${className}`}>{children}</div>;
}

function ScorePill({ a }: { a: { score: number; total: number } }) {
  const p = pct(a);
  const tone = p >= 75 ? "bg-success text-primary-foreground" : p >= 50 ? "bg-warning text-accent-foreground" : "bg-destructive text-destructive-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {a.score}/{a.total} · {p}%
    </span>
  );
}

const blankQ = (): Question => ({ id: uid(), text: "", options: ["", ""], correct: 0 });

function Teacher({ store, update }: P) {
  const [title, setTitle] = useState("");
  const [max, setMax] = useState(1);
  const [qs, setQs] = useState<Question[]>([blankQ()]);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  const setQ = (i: number, q: Partial<Question>) => setQs(qs.map((x, j) => (j === i ? { ...x, ...q } : x)));

  const create = () => {
    if (!title.trim()) return setErr("Give the quiz a title.");
    if (max < 1) return setErr("Allow at least 1 attempt.");
    for (const q of qs) {
      if (!q.text.trim() || q.options.some((o) => !o.trim())) return setErr("Fill in every question and option.");
    }
    update({ ...store, quizzes: [...store.quizzes, { id: uid(), title: title.trim(), maxAttempts: max, questions: qs }] });
    setTitle("");
    setMax(1);
    setQs([blankQ()]);
    setErr("");
    setOpen(false);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this quiz and all its attempts?")) return;
    update({ quizzes: store.quizzes.filter((q) => q.id !== id), attempts: store.attempts.filter((a) => a.quizId !== id) });
  };

  return (
    <div className="space-y-8">
      {!open ? (
        <Button size="lg" onClick={() => setOpen(true)}>+ Create new quiz</Button>
      ) : (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">New quiz</h2>
            <button className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>Cancel</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <Field label="Quiz title">
              <Input placeholder="e.g. Chapter 3 — Fractions" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Max attempts">
              <Input type="number" min={1} value={max} onChange={(e) => setMax(Number(e.target.value))} />
            </Field>
          </div>
          <div className="mt-5 space-y-4">
            {qs.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-border bg-background p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                    Q{i + 1}
                  </span>
                  {qs.length > 1 && (
                    <button className="text-xs font-medium text-destructive" onClick={() => setQs(qs.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  )}
                </div>
                <Input placeholder="Question text" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
                <div className="mt-3 space-y-2">
                  {q.options.map((o, k) => (
                    <div key={k} className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Mark option ${k + 1} correct`}
                        onClick={() => setQ(i, { correct: k })}
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-bold transition ${q.correct === k ? "border-success bg-success text-primary-foreground" : "border-border text-muted-foreground"}`}
                      >
                        {q.correct === k ? "✓" : String.fromCharCode(65 + k)}
                      </button>
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + k)}`}
                        value={o}
                        onChange={(e) => setQ(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })}
                      />
                      {q.options.length > 2 && (
                        <button
                          className="px-1 text-muted-foreground"
                          aria-label="Remove option"
                          onClick={() =>
                            setQ(i, {
                              options: q.options.filter((_, m) => m !== k),
                              correct: q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct,
                            })
                          }
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button className="mt-2 text-sm font-semibold text-primary" onClick={() => setQ(i, { options: [...q.options, ""] })}>
                  + Add option
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Tap the letter beside an option to mark it correct.</p>
          {err && <p className="mt-3 text-sm font-medium text-destructive">{err}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setQs([...qs, blankQ()])}>+ Question</Button>
            <Button onClick={create}>Publish quiz</Button>
          </div>
        </Card>
      )}

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Quizzes & results</h2>
        {store.quizzes.length === 0 && <Empty text="No quizzes yet — create your first one above." />}
        <div className="grid gap-4 md:grid-cols-2">
          {store.quizzes.map((qz) => {
            const atts = store.attempts.filter((a) => a.quizId === qz.id);
            const best = atts.length ? Math.max(...atts.map(pct)) : null;
            return (
              <Card key={qz.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{qz.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {qz.questions.length} questions · {qz.maxAttempts} {qz.maxAttempts === 1 ? "try" : "tries"} max
                    </p>
                  </div>
                  <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => remove(qz.id)}>
                    Delete
                  </button>
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <span><b>{atts.length}</b> attempts</span>
                  {best !== null && <span>Top <b>{best}%</b></span>}
                </div>
                <AttemptTable attempts={atts} showStudent />
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">{text}</div>;
}

function AttemptTable({ attempts, showStudent }: { attempts: Attempt[]; showStudent?: boolean }) {
  if (!attempts.length) return <p className="mt-3 text-sm text-muted-foreground">No attempts yet.</p>;
  return (
    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">#</th>
            {showStudent && <th className="px-3 py-2">Student</th>}
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2 text-right">Score</th>
          </tr>
        </thead>
        <tbody>
          {[...attempts].reverse().map((a, i) => (
            <tr key={a.id} className="border-t border-border">
              <td className="px-3 py-2 text-muted-foreground">{attempts.length - i}</td>
              {showStudent && <td className="px-3 py-2 font-medium">{a.student}</td>}
              <td className="px-3 py-2 text-muted-foreground">
                {new Date(a.at).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="px-3 py-2 text-right"><ScorePill a={a} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Student({ store, update }: P) {
  const [name, setName] = useState("");
  const [active, setActive] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; total: number; title: string } | null>(null);
  const [err, setErr] = useState("");

  if (active) {
    const answered = answers.filter((a) => a !== undefined).length;
    const progress = Math.round((answered / active.questions.length) * 100);
    const submit = () => {
      if (answered < active.questions.length) return setErr("Answer every question before submitting.");
      try {
        const next = submitAttempt(store, active, name, answers);
        update(next);
        const last = next.attempts[next.attempts.length - 1]!;
        setResult({ score: last.score, total: last.total, title: active.title });
        setActive(null);
      } catch (e) {
        setErr((e as Error).message);
      }
    };
    return (
      <div className="space-y-4">
        <Card className="sticky top-2 z-10">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">{active.title}</h2>
            <span className="text-sm font-semibold text-muted-foreground">{answered}/{active.questions.length}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </Card>
        {active.questions.map((q, i) => (
          <Card key={q.id}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Question {i + 1}</p>
            <p className="mb-3 mt-1 text-lg font-medium">{q.text}</p>
            <div className="space-y-2">
              {q.options.map((o, k) => {
                const sel = answers[i] === k;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      const a = [...answers];
                      a[i] = k;
                      setAnswers(a);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${sel ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${sel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {String.fromCharCode(65 + k)}
                    </span>
                    {o}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
        {err && <p className="text-sm font-medium text-destructive">{err}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setActive(null)}>Cancel</Button>
          <Button size="lg" onClick={submit}>Submit answers</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <Field label="Your name">
          <Input placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      </Card>
      {result && (
        <div className="flex items-center gap-5 rounded-xl bg-hero-gradient p-6 text-hero-foreground shadow-card">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-accent font-display text-2xl font-extrabold">
            {pct(result)}%
          </div>
          <div>
            <p className="text-sm text-hero-foreground/70">{result.title}</p>
            <p className="font-display text-2xl font-extrabold">
              {result.score} of {result.total} correct
            </p>
          </div>
        </div>
      )}
      {store.quizzes.length === 0 && <Empty text="No quizzes available yet." />}
      <div className="grid gap-4 md:grid-cols-2">
        {store.quizzes.map((qz) => {
          const has = !!name.trim();
          const mine = has ? attemptsFor(store, qz.id, name) : [];
          const allowed = has && canAttempt(store, qz, name);
          return (
            <Card key={qz.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{qz.title}</h3>
                  <p className="text-sm text-muted-foreground">{qz.questions.length} questions</p>
                </div>
                <Button
                  disabled={!allowed}
                  onClick={() => {
                    setActive(qz);
                    setAnswers([]);
                    setErr("");
                    setResult(null);
                  }}
                >
                  {has && !allowed ? "Limit reached" : mine.length ? "Retake" : "Start"}
                </Button>
              </div>
              {has && (
                <>
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: qz.maxAttempts }).map((_, i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full ${i < mine.length ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mine.length} of {qz.maxAttempts} attempts used
                  </p>
                  <AttemptTable attempts={mine} />
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
