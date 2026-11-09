"use client";

import type { FormEvent } from "react";

const STUDY_CONTACT_EMAIL = "michael@sparklingjavascript.com";

export function StudyQuestionForm({ userEmail }: { userEmail?: string | null }) {
  function openEmailDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const question = formData.get("question")?.toString().trim();

    if (!question) return;

    const subject = encodeURIComponent("Question about the Humor Study");
    const body = encodeURIComponent(
      `${question}\n\nAccount email: ${userEmail || "Not provided"}`
    );

    window.location.href = `mailto:${STUDY_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={openEmailDraft} className="space-y-4">
      <label className="block text-sm font-medium">
        Your question
        <textarea
          name="question"
          required
          maxLength={2000}
          rows={4}
          placeholder="What would you like to know?"
          className="mt-2 w-full resize-y rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--foreground)] outline-none ring-1 ring-[var(--input-border)] transition focus:ring-2 focus:ring-[var(--input-ring)]"
        />
      </label>
      <button
        type="submit"
        className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]"
      >
        Prepare question email
      </button>
      <p className="text-sm leading-6 text-[var(--muted)]">
        This opens an email draft to{" "}
        <a
          href={`mailto:${STUDY_CONTACT_EMAIL}`}
          className="underline underline-offset-2"
        >
          {STUDY_CONTACT_EMAIL}
        </a>
        . Review it and press Send in your email app. Please don&apos;t include
        sensitive personal information.
      </p>
    </form>
  );
}
