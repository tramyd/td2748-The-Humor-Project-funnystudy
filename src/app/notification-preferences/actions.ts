"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildNotificationPreferencesPath, encodeNotificationSkips, isNotificationPreference,
  notificationNextPath, NOTIFICATION_SKIPS_COOKIE, readNotificationSkips,
} from "@/lib/notification-preferences";
import { createClient } from "@/lib/supabase/server";

async function respondToPreference(formData: FormData, answer: boolean | null) {
  const supabase = await createClient({ allowCookieWrite: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nextValue = formData.get("next");
  const next = notificationNextPath(typeof nextValue === "string" ? nextValue : "/");
  const values = formData.getAll("preference");
  const preference = values[0];
  if (values.length !== 1 || !isNotificationPreference(preference)) {
    redirect(buildNotificationPreferencesPath(next, "Please try your choice again."));
  }

  if (answer === null) {
    const cookieStore = await cookies();
    const skipped = readNotificationSkips(cookieStore.get(NOTIFICATION_SKIPS_COOKIE)?.value, user.id);
    cookieStore.set(NOTIFICATION_SKIPS_COOKIE, encodeNotificationSkips(user.id, [...skipped, preference]), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
    });
  } else {
    // A stale form cannot overwrite an answer saved in Settings or another tab.
    const { data, error } = await supabase.from("profiles")
      .update({ [preference]: answer, modified_by_user_id: user.id })
      .eq("id", user.id).is(preference, null).select("id");
    if (error || !data?.length) {
      // No returned row can mean a concurrent answer. Confirm before advancing.
      const current = await supabase.from("profiles")
        .select("notify_new_study_email, notify_new_study_sms, notify_new_study_phone_call")
        .eq("id", user.id).single();
      if (error || current.error || !current.data || current.data[preference] === null) {
        console.error("[Notifications] save preference failed", error ?? current.error);
        redirect(buildNotificationPreferencesPath(next, "We couldn’t save your choice. Please try again."));
      }
    }
    revalidatePath("/", "layout");
  }
  redirect(buildNotificationPreferencesPath(next));
}

export async function acceptNotification(formData: FormData) {
  await respondToPreference(formData, true);
}

export async function declineNotification(formData: FormData) {
  await respondToPreference(formData, false);
}

export async function skipNotification(formData: FormData) {
  await respondToPreference(formData, null);
}

export async function saveNotificationPreferences(
  _previousState: { status: "idle" | "error"; message: string },
  formData: FormData
) {
  if (!(formData instanceof FormData)) {
    formData = _previousState as unknown as FormData;
  }
  const supabase = await createClient({ allowCookieWrite: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const nextValue = formData.get("next");
  const next = notificationNextPath(typeof nextValue === "string" ? nextValue : "/");
  const fields = {
    notify_new_study_email: formData.get("notify_new_study_email"),
    notify_new_study_sms: formData.get("notify_new_study_sms"),
    notify_new_study_phone_call: formData.get("notify_new_study_phone_call"),
  };
  if (!Object.values(fields).every((value) => value === "yes" || value === "no" || value === "skip")) {
    return { status: "error" as const, message: "Please choose Yes, No, or Skip for each reminder method." };
  }
  const values = Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    key,
    value === "yes" ? true : value === "no" ? false : null,
  ]));
  const wantsPhone = values.notify_new_study_sms === true || values.notify_new_study_phone_call === true;

  const cookieStore = await cookies();
  const existingSkips = readNotificationSkips(cookieStore.get(NOTIFICATION_SKIPS_COOKIE)?.value, user.id);
  const skipped = new Set(existingSkips);
  for (const [field, answer] of Object.entries(fields)) {
    if (answer === "skip" && isNotificationPreference(field)) skipped.add(field);
  }
  cookieStore.set(NOTIFICATION_SKIPS_COOKIE, encodeNotificationSkips(user.id, [...skipped]), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
  });

  for (const [field, answer] of Object.entries(values)) {
    if (answer !== null) {
      const { error } = await supabase.from("profiles").update({
        [field]: answer,
        modified_by_user_id: user.id,
      }).eq("id", user.id).is(field, null);
      if (error) return { status: "error" as const, message: "We couldn’t save your preferences. Please try again." };
    }
  }

  if (wantsPhone) {
    const { normalizePhone, phoneSettingsForUser } = await import("@/lib/phone-settings");
    const phoneState = phoneSettingsForUser(user);
    const submittedPhone = formData.get("phone");
    const phone = typeof submittedPhone === "string" ? normalizePhone(submittedPhone) : "";
    if (!phoneState.verifiedPhone) {
      if (!phone || formData.getAll("phone").length !== 1) {
        return { status: "error" as const, message: "Enter your phone number with its country code." };
      }
      if (formData.get("verification_sms_consent") !== "on") {
        return { status: "error" as const, message: "Agree to receive the verification text before sending a code." };
      }
      const { error } = await supabase.auth.updateUser({ phone });
      if (error) {
        return { status: "error" as const, message: error.status === 429
          ? "Please wait a minute before requesting another code."
          : "We couldn’t send a verification code. Please try again." };
      }
      revalidatePath("/notification-preferences");
      redirect(buildNotificationPreferencesPath(next, "A verification code was sent to your phone."));
    }
  }

  revalidatePath("/notification-preferences");
  redirect(buildNotificationPreferencesPath(next));
}

export async function verifyNotificationPhone(
  _previousState: { status: "idle" | "error"; message: string },
  formData: FormData
) {
  if (!(formData instanceof FormData)) {
    formData = _previousState as unknown as FormData;
  }
  const supabase = await createClient({ allowCookieWrite: true });
  const { data: { user } } = await supabase.auth.getUser();
  const nextValue = formData.get("next");
  const next = notificationNextPath(typeof nextValue === "string" ? nextValue : "/");
  if (!user) redirect("/login");
  const code = typeof formData.get("code") === "string" ? String(formData.get("code")).trim() : "";
  const phone = user.new_phone;
  if (!phone || !/^\d{6}$/.test(code)) {
    return { status: "error" as const, message: "Enter the six-digit verification code." };
  }
  const { data, error } = await supabase.auth.verifyOtp({ phone, token: code, type: "phone_change" });
  if (error || !data.user || data.user.id !== user.id || !data.user.phone_confirmed_at) {
    return { status: "error" as const, message: "That code is invalid or has expired. Try again." };
  }
  revalidatePath("/notification-preferences", "layout");
  redirect(buildNotificationPreferencesPath(next));
}
