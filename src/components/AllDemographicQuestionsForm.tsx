"use client";

import { useState } from "react";
import { useActionState } from "react";

import { saveDemographicSurvey } from "@/app/demographics/actions";
import type { DemographicQuestion } from "@/lib/demographics";
import { SubmitButton } from "./SubmitButton";

const initialState = { status: "idle" as const, message: "" };

export function AllDemographicQuestionsForm({
  questions,
  next,
  skipped,
  message,
}: {
  questions: readonly DemographicQuestion[];
  next: string;
  skipped: readonly string[];
  message?: string | null;
}) {
  const [state, action] = useActionState(saveDemographicSurvey, initialState);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <section className="w-full shrink-0 rounded-lg border border-[var(--card-border)] bg-[var(--card-surface)] p-5 shadow-[var(--panel-shadow)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">Participant Demographic Survey</p>
      <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">Tell us about yourself</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Please answer all questions, then submit your responses.</p>
      {message || state.message ? (
        <p role="alert" className="mt-5 rounded-lg bg-[color-mix(in_srgb,_var(--accent)_12%,_transparent)] px-4 py-3 text-sm font-medium ring-1 ring-[var(--panel-border)]">
          {state.message || message}
        </p>
      ) : null}

      <form action={action} className="mt-7 space-y-5">
        <input type="hidden" name="next" value={next} />
        {skipped.map((questionId) => <input key={questionId} type="hidden" name="skipped" value={questionId} />)}
        {questions.map((question, index) => {
          const fieldName = `question_${question.id}`;
          const useSelect = question.options.length > 2;
          return (
            <fieldset key={question.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4 sm:p-5">
              <legend className="px-1 text-sm font-bold text-[var(--foreground)] sm:text-base">
                {index + 1}. {question.prompt}
              </legend>
              {useSelect ? (
                <label className="mt-3 block">
                  <span className="sr-only">{question.prompt}</span>
                  <select
                    name={fieldName}
                    required
                    value={answers[fieldName] ?? ""}
                    onChange={(event) => setAnswers((current) => ({ ...current, [fieldName]: event.target.value }))}
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--input-ring)]"
                  >
                    <option value="" disabled>Select an option</option>
                    {question.options.map((option) => (
                      <option key={option.mappingId} value={`${option.mappingId}::${option.id}`}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {question.options.map((option) => (
                    <label key={option.mappingId} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm font-semibold">
                      <input
                        type="radio"
                        name={fieldName}
                        required
                        value={`${option.mappingId}::${option.id}`}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          );
        })}
        <SubmitButton pendingLabel="Saving…" className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-contrast)]">
          Submit demographic survey
        </SubmitButton>
      </form>
    </section>
  );
}
