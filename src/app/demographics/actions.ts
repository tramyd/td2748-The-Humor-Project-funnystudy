"use server";

import { redirect } from "next/navigation";

import {
  buildDemographicsPath,
  parseDemographicAnswerSelection,
  saveDemographicAnswer,
} from "@/lib/demographics";
import { createClient } from "@/lib/supabase/server";
import { normalizeRelativePath } from "@/lib/url";

export type SaveDemographicAnswerSelectionResult =
  | { success: true; redirectPath: string }
  | { success: false; error: string };

function getSkippedQuestionIds(formData: FormData) {
  return formData
    .getAll("skipped")
    .map((value) => value.toString().trim())
    .filter((value) => value.length > 0);
}

function getRedirectPath(formData: FormData, message?: string | null) {
  return buildDemographicsPath({
    message,
    next: normalizeRelativePath(formData.get("next")?.toString()),
    skippedQuestionIds: getSkippedQuestionIds(formData),
  });
}

function getRedirectPathFromValues({
  message,
  next,
  skippedQuestionIds,
}: {
  message?: string | null;
  next: string;
  skippedQuestionIds: readonly string[];
}) {
  return buildDemographicsPath({
    message,
    next: normalizeRelativePath(next),
    skippedQuestionIds,
  });
}

export async function saveDemographicQuestionAnswerSelection({
  answerSelection,
  next,
  questionId,
  skippedQuestionIds,
}: {
  answerSelection: string;
  next: string;
  questionId: string;
  skippedQuestionIds: readonly string[];
}): Promise<SaveDemographicAnswerSelectionResult> {
  const supabase = await createClient({ allowCookieWrite: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  const trimmedQuestionId = questionId.trim();
  const selection = parseDemographicAnswerSelection(answerSelection);

  if (!trimmedQuestionId || !selection) {
    return { success: false, error: "Choose an answer or skip this question." };
  }

  const { error } = await saveDemographicAnswer(supabase, {
    answerId: selection.answerId,
    mappingId: selection.mappingId,
    profileId: user.id,
    questionId: trimmedQuestionId,
  });

  if (error) {
    console.error("[Demographics] save answer failed", error);
    return { success: false, error: "We could not save that answer. Try again." };
  }

  return {
    success: true,
    redirectPath: getRedirectPathFromValues({ next, skippedQuestionIds }),
  };
}

export async function saveDemographicSurvey(
  _previousState: { status: "idle" | "error"; message: string },
  formData: FormData
): Promise<{ status: "idle" | "error"; message: string }> {
  const supabase = await createClient({ allowCookieWrite: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const next = normalizeRelativePath(formData.get("next")?.toString());
  const skippedQuestionIds = getSkippedQuestionIds(formData);
  const selections = new Map<string, string>();

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("question_")) {
      selections.set(key.slice("question_".length), value.toString());
    }
  }

  if (selections.size === 0) {
    return { status: "error", message: "Choose an answer for every question." };
  }

  for (const [questionId, answerSelection] of selections) {
    const selection = parseDemographicAnswerSelection(answerSelection);
    if (!selection) {
      return { status: "error", message: "Choose an answer for every question." };
    }

    const { error } = await saveDemographicAnswer(supabase, {
      answerId: selection.answerId,
      mappingId: selection.mappingId,
      profileId: user.id,
      questionId,
    });

    if (error) {
      console.error("[Demographics] save survey answer failed", error);
      return { status: "error", message: "We could not save your answers. Try again." };
    }
  }

  redirect(buildDemographicsPath({ next, skippedQuestionIds }));
}

export async function saveDemographicQuestionAnswer(formData: FormData) {
  const supabase = await createClient({ allowCookieWrite: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const questionId = formData.get("question_id")?.toString().trim() ?? "";
  const selection = parseDemographicAnswerSelection(
    formData.get("answer_selection")?.toString()
  );

  if (!questionId || !selection) {
    redirect(getRedirectPath(formData, "Choose an answer or skip this question."));
  }

  const { error } = await saveDemographicAnswer(supabase, {
    answerId: selection.answerId,
    mappingId: selection.mappingId,
    profileId: user.id,
    questionId,
  });

  if (error) {
    console.error("[Demographics] save answer failed", error);
    redirect(getRedirectPath(formData, "We could not save that answer. Try again."));
  }

  redirect(getRedirectPath(formData));
}

export async function skipDemographicQuestion(formData: FormData) {
  const questionId = formData.get("question_id")?.toString().trim() ?? "";
  const skippedQuestionIds = new Set(getSkippedQuestionIds(formData));

  if (questionId) {
    skippedQuestionIds.add(questionId);
  }

  redirect(
    buildDemographicsPath({
      next: normalizeRelativePath(formData.get("next")?.toString()),
      skippedQuestionIds,
    })
  );
}
