"use client";

import { useEffect, useRef, useState } from "react";
import { collectReviewContext, checkProposedVisit } from "@/lib/reviewContext";
import { stopFingerprint, validateProposal, type DayReview, type ReviewBounds, type ReviewCandidate, type ReviewProposal } from "@/lib/aiReview";
import type { Stop } from "../types";

type Props = {
  itineraryId: string; day: string; stops: Stop[]; allStops: Stop[];
  onClose: () => void;
  onPreview: (proposal: ReviewProposal | null, candidates: ReviewCandidate[]) => void;
  onApply: (proposal: ReviewProposal, candidates: ReviewCandidate[], bounds: ReviewBounds, snapshot: string) => Promise<{ saved: Stop; snapshot: string }>;
  onUndo: () => Promise<void>; canUndo: boolean;
};
type Result = DayReview & { snapshot: string; candidates: ReviewCandidate[] };
const button = "rounded-lg border border-line px-3 py-2 text-xs font-medium hover:bg-canvas disabled:opacity-50 disabled:cursor-not-allowed";
const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export default function ReviewPanel({ itineraryId, day, stops, allStops, onClose, onPreview, onApply, onUndo, canUndo }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [preferences, setPreferences] = useState("");
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [refining, setRefining] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, string[]>>({});
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dayStart = new Date(`${day}T00:00:00`).toISOString();
  const endDate = new Date(`${day}T00:00:00`); endDate.setDate(endDate.getDate() + 1);
  const bounds = { dayStart, dayEnd: endDate.toISOString(), lockedIds };
  const snapshot = stopFingerprint(allStops);
  const stale = !!result && result.snapshot !== snapshot;
  useEffect(() => {
    dialog.current?.showModal();
    return () => request.current?.abort();
  }, []);

  async function review(refine?: ReviewProposal) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy("Checking your day and nearby places…"); setError(""); setNotice("");
    onPreview(null, []); setPreviewId(null);
    const extra = refine ? `Replace this suggestion: ${JSON.stringify(refine)}. Traveler says: ${instruction.trim() || "Suggest a different option."}` : "";
    const history = [...feedback, ...(extra ? [extra] : [])].slice(-20);
    try {
      const context = await collectReviewContext(stops, allStops, `${preferences} ${instruction}`, day);
      if (controller.signal.aborted) return;
      const located = stops.find((s) => s.latitude != null && s.longitude != null);
      const weather = located ? await fetch(`/api/weather?${new URLSearchParams({ day, lat: String(located.latitude), lon: String(located.longitude) })}`, { signal: controller.signal }).then((r) => r.ok ? r.json() : null).catch(() => null) : null;
      if (controller.signal.aborted) return;
      setBusy("Gemini is reviewing your day…");
      const response = await fetch("/api/itinerary-review", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ itineraryId, day, dayStart, dayEnd: bounds.dayEnd, timeZone, snapshot, lockedIds, preferences, feedback: history, refine: !!refine, candidates: context.candidates, evidence: { legs: context.legs, hours: context.hours, discovery: context.discovery, weather } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t review this day.");
      if (controller.signal.aborted) return;
      if (refine && result) {
        const replacement = (data.proposals as ReviewProposal[]).map((p) => ({ ...p, id: refine.id }));
        const candidates = [...result.candidates.filter((c) => !context.candidates.some((n) => n.id === c.id)), ...context.candidates];
        setResult({ ...result, proposals: result.proposals.flatMap((p) => p.id === refine.id ? replacement : [p]), candidates });
        if (!replacement.length) setNotice("Gemini found no suitable alternative for that change. The other suggestions are unchanged.");
      } else {
        setResult({ ...data, candidates: context.candidates }); setDismissed([]); setAccepted([]);
      }
      setFeedback(history); setRefining(null); setInstruction(""); setChecks({});
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Review failed. Please try again."); }
    finally { if (!controller.signal.aborted) setBusy(""); }
  }

  async function preview(p: ReviewProposal) {
    if (!result || stale) return;
    setBusy("Checking travel and opening hours…"); setError("");
    try {
      const messages = await checkProposedVisit(p, allStops, result.candidates, bounds);
      setChecks((current) => ({ ...current, [p.id]: messages }));
      onPreview(p, result.candidates); setPreviewId(p.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t verify this change."); }
    finally { setBusy(""); }
  }

  async function accept(p: ReviewProposal) {
    if (!result || stale) return;
    setBusy("Checking and saving this change…"); setError("");
    try {
      const { saved, snapshot: savedSnapshot } = await onApply(p, result.candidates, bounds, result.snapshot);
      // Advance only to the snapshot produced by this save, never to unrelated realtime edits.
      setResult((current) => current ? { ...current, snapshot: savedSnapshot } : current);
      setChecks({});
      setAccepted((ids) => [...ids, p.id]); setLockedIds((ids) => [...new Set([...ids, saved.id])]);
      setFeedback((items) => [...items, `Accepted ${p.title}. Keep ${saved.name} at ${saved.start_time} to ${saved.end_time}.`].slice(-20));
      setNotice("Saved. You can accept another suggestion from this review. Each change is checked against your updated day.");
      onPreview(null, []); setPreviewId(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t save this change."); }
    finally { setBusy(""); }
  }

  async function undo() {
    setBusy("Undoing the last change…"); setError("");
    try { await onUndo(); setNotice("Last AI change undone. Review again to get updated suggestions."); onPreview(null, []); setResult(null); setAccepted([]); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn’t undo this change."); }
    finally { setBusy(""); }
  }

  return <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="review-title" className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-xl border-l border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/10">
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between border-b border-line p-5"><div><h2 id="review-title" className="text-lg font-semibold">Review my day <span className="text-primary">✦</span></h2><p className="mt-1 text-xs text-muted">{day} · Powered by Gemini</p></div><button type="button" onClick={onClose} disabled={!!busy} aria-label="Close day review" className={button}>✕</button></header>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <p className="text-sm leading-relaxed text-muted">Get up to three thoughtful changes. Preview each one, accept what you like, or ask for something different. Nothing changes automatically.</p>
        <div><label htmlFor="review-preferences" className="mb-2 block text-sm font-medium">What would make this day better?</label><textarea id="review-preferences" value={preferences} onChange={(e) => setPreferences(e.target.value)} maxLength={1000} rows={2} placeholder="Less walking, a relaxed pace, quiet cafés…" className="w-full rounded-lg border border-line bg-canvas p-3 text-sm" /></div>
        <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm font-medium">Keep activities fixed ({lockedIds.length})</summary><p className="my-2 text-xs text-muted">Lock reservations and anything you don’t want moved.</p><div className="space-y-2">{stops.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lockedIds.includes(s.id)} disabled={!!busy} onChange={(e) => { setLockedIds((ids) => e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id)); onPreview(null, []); setPreviewId(null); }} /><span>{clock(s.start_time)} · {s.name}</span></label>)}</div></details>
        <p className="text-xs text-muted">Calendar times: {timeZone.replaceAll("_", " ")}. This review uses the same timezone as your calendar.</p>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={!!busy || !stops.length} onClick={() => review()} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{result ? "Review latest day" : "Review this day"}</button>{canUndo && <button type="button" disabled={!!busy} onClick={undo} className={button}>Undo last AI change</button>}</div>
        {busy && <div role="status" className="rounded-lg bg-canvas p-3 text-sm">{busy}</div>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-ok-bg p-3 text-sm text-ok-text">{notice}</p>}
        {stale && <p role="status" className="rounded-lg border border-line p-3 text-sm">The itinerary has changed since this review. Review the latest day before accepting more changes.</p>}
        {result && <><div><h3 className="mb-2 text-sm font-semibold">Your day at a glance</h3><p className="text-sm leading-relaxed">{result.summary}</p><ul className="mt-3 list-disc space-y-2 pl-4 text-xs text-muted">{result.observations.map((o, i) => <li key={i}>{o}</li>)}</ul></div>
          {!result.proposals.length && <p className="text-sm text-muted">No schedule changes to propose. You can adjust your preferences and review again.</p>}
          {result.proposals.map((p) => {
            const original = allStops.find((s) => s.id === p.stopId);
            const isAccepted = accepted.includes(p.id), isDismissed = dismissed.includes(p.id);
            const isLocked = p.kind === "reschedule" && lockedIds.includes(p.stopId);
            const conflict = !isAccepted && !isDismissed && !isLocked && !stale ? validateProposal(p, allStops, result.candidates, bounds) : null;
            const disabled = !!busy || stale || isAccepted || isDismissed || isLocked;
            return <article key={p.id} className={`rounded-xl border p-4 ${previewId === p.id ? "border-primary" : "border-line"}`}><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold">{p.title}</h3><span className="shrink-0 text-xs text-muted">{isAccepted ? "Accepted ✓" : isDismissed ? "Dismissed" : p.kind === "add" ? "Add a stop" : "Change times"}</span></div><p className="mt-2 text-sm leading-relaxed text-muted">{p.reason}</p><div className="my-3 rounded-lg bg-canvas p-3 text-sm">{original && <div className="text-muted"><span className="mr-2 text-xs">BEFORE</span>{clock(original.start_time)} – {clock(original.end_time)}</div>}<div><span className="mr-2 text-xs text-primary">PROPOSED</span>{clock(p.start)} – {clock(p.end)}</div></div>
              {checks[p.id] && <ul className="mb-3 space-y-1 text-xs text-muted">{checks[p.id].map((c) => <li key={c}>{c}</li>)}</ul>}
              {isLocked && !isAccepted && <p className="mb-2 text-xs text-muted">This activity is locked. Unlock it to consider this change.</p>}
              {conflict && <p className="mb-2 text-xs text-muted">{conflict} You can dismiss this suggestion or ask for an alternative.</p>}
              {!isAccepted && !isDismissed && <div className="flex flex-wrap gap-2"><button type="button" disabled={disabled} className={button} onClick={() => preview(p)}>Preview</button><button type="button" disabled={disabled} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50" onClick={() => accept(p)}>Accept</button><button type="button" disabled={!!busy} className={button} onClick={() => { setDismissed((ids) => [...ids, p.id]); setFeedback((items) => [...items, `Dismissed: ${p.title}. ${p.reason}`].slice(-20)); if (previewId === p.id) { onPreview(null, []); setPreviewId(null); } }}>Dismiss</button><button type="button" disabled={disabled} className={button} onClick={() => { setRefining(p.id); setInstruction(""); }}>Something else</button></div>}
              {refining === p.id && !isDismissed && <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); review(p); }}><label htmlFor={`refine-${p.id}`} className="block text-xs text-muted">What should change about this suggestion?</label><input id={`refine-${p.id}`} maxLength={500} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Keep lunch. Suggest a shorter activity instead." className="w-full rounded-lg border border-line bg-canvas p-2 text-sm" /><button type="submit" disabled={disabled} className={button}>Find an alternative</button></form>}
            </article>;
          })}</>}
      </div>
    </div>
  </dialog>;
}
