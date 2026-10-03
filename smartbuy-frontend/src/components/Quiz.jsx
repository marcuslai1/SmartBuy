import { useState } from 'react';
import { fmtNum } from '../lib/data';
import { MUST_HAVES, SIZES } from '../lib/engine';
import {
  BUDGET_CHOICES,
  DEFAULT_ANSWERS,
  FOCUS,
  KEEP,
  MAX_FOCUS,
  OS_CHOICES,
  STORAGE_CHOICES,
  loadAnswers,
} from '../lib/quiz';
import Dialog from './Dialog';

/** "Find my phone": a few questions that set the priorities and filters. */
export default function Quiz({ open, onClose, onSubmit }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Find my phone"
      subtitle="Six quick questions"
      variant="center"
      labelId="quiz-title"
    >
      <QuizForm onSubmit={onSubmit} />
    </Dialog>
  );
}

function Question({ n, title, hint, children }) {
  return (
    <fieldset className="border-b border-line px-4 py-4 last:border-b-0 sm:px-6">
      <legend className="float-left w-full text-sm font-semibold text-ink">
        <span className="tnum mr-1.5 text-muted">{n}</span>
        {title}
      </legend>
      {hint && <p className="clear-both pt-0.5 text-xs text-muted">{hint}</p>}
      <div className="clear-both pt-2.5">{children}</div>
    </fieldset>
  );
}

function Radios({ name, options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <label key={String(o.key)} className="seg-opt" title={o.title}>
          <input type="radio" name={name} checked={value === o.key} onChange={() => onChange(o.key)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function QuizForm({ onSubmit }) {
  const [a, setA] = useState(loadAnswers);
  const set = (patch) => setA((prev) => ({ ...prev, ...patch }));
  const toggle = (key, value, limit) => {
    const list = a[key];
    if (list.includes(value)) set({ [key]: list.filter((x) => x !== value) });
    else if (!limit || list.length < limit) set({ [key]: [...list, value] });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(a);
      }}
    >
      <Question n="1" title="iPhone or Android?">
        <Radios name="q-os" options={OS_CHOICES} value={a.os} onChange={(os) => set({ os })} />
      </Question>

      <Question n="2" title="What’s the most you’d spend?">
        <Radios
          name="q-budget"
          options={[
            ...BUDGET_CHOICES.map((b) => ({ key: b, label: `S$${fmtNum(b)}` })),
            { key: null, label: 'No limit' },
          ]}
          value={a.budget}
          onChange={(budget) => set({ budget })}
        />
      </Question>

      <Question
        n="3"
        title="How much storage do you need?"
        hint="Not sure? Check Settings › Storage on your current phone and pick the next size up from what you use."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {STORAGE_CHOICES.map((o) => (
            <label
              key={o.key}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--accent-ink)] ${
                a.storage === o.key ? 'border-accent-ink bg-accent-soft' : 'border-line-strong hover:border-muted'
              }`}
            >
              <input
                type="radio"
                name="q-storage"
                className="sr-only"
                checked={a.storage === o.key}
                onChange={() => set({ storage: o.key })}
              />
              <span className="block font-semibold text-ink">{o.label}</span>
              <span className="block text-xs text-ink-2">{o.hint}</span>
            </label>
          ))}
        </div>
      </Question>

      <Question n="4" title="What size feels right?">
        <Radios
          name="q-size"
          options={SIZES.map((s) => ({
            key: s.key,
            label: s.key === 'any' ? 'No preference' : s.label,
            title: s.title,
          }))}
          value={a.size}
          onChange={(size) => set({ size })}
        />
        <p className="mt-1.5 text-xs text-muted">Compact is under 6.4″ (easier one-handed); large is 6.8″ and up.</p>
      </Question>

      <Question n="5" title={`What matters most? Pick up to ${MAX_FOCUS}`} hint="Leave it empty for a balanced mix.">
        <div className="flex flex-wrap gap-1.5">
          {FOCUS.map((f) => {
            const on = a.focus.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                className="chip"
                aria-pressed={on}
                disabled={!on && a.focus.length >= MAX_FOCUS}
                onClick={() => toggle('focus', f.key, MAX_FOCUS)}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </Question>

      <Question n="6" title="How long will you keep it?">
        <Radios name="q-keep" options={KEEP} value={a.keep} onChange={(keep) => set({ keep })} />
      </Question>

      <Question n="+" title="Anything it must have?" hint="Optional. Phones without these are left out.">
        <div className="flex flex-wrap gap-1.5">
          {MUST_HAVES.map((m) => (
            <button
              key={m.key}
              type="button"
              className="chip"
              aria-pressed={a.must.includes(m.key)}
              onClick={() => toggle('must', m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Question>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3 sm:px-6">
        <button type="button" className="btn btn-ghost px-2 text-muted" onClick={() => setA({ ...DEFAULT_ANSWERS })}>
          Start over
        </button>
        <button type="submit" className="btn btn-primary">
          Show my picks
        </button>
      </div>
    </form>
  );
}
