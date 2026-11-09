import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signOut } from "@/app/profile-actions";
import { AccountMenu } from "@/components/AccountMenu";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import { DEMOGRAPHIC_SKIPS_COOKIE, readDemographicSkips } from "@/lib/demographic-skips";
import { buildDemographicsPath, hasPendingDemographicQuestions } from "@/lib/demographics";
import {
  fetchNotificationPreferences, notificationNextPath, NOTIFICATION_SKIPS_COOKIE, readNotificationSkips,
} from "@/lib/notification-preferences";
import { phoneSettingsForUser } from "@/lib/phone-settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notification preferences | Humor Study" };

export default async function NotificationPreferencesPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const next = notificationNextPath(params.next);
  const message = Array.isArray(params.message) ? params.message[0] : params.message;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const cookieStore = await cookies();
  const skipped = readNotificationSkips(cookieStore.get(NOTIFICATION_SKIPS_COOKIE)?.value, user.id);
  const { profile, pending } = await fetchNotificationPreferences(supabase, user.id, skipped);
  const phoneState = phoneSettingsForUser(user);
  if (!pending.length && !phoneState.pendingPhone) {
    const skippedQuestionIds = readDemographicSkips(cookieStore.get(DEMOGRAPHIC_SKIPS_COOKIE)?.value, user.id);
    if (await hasPendingDemographicQuestions(supabase, user.id, skippedQuestionIds)) {
      redirect(buildDemographicsPath({ next, skippedQuestionIds }));
    }
    redirect(next);
  }
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim()
    || user.email || "your account";

  return (
    <div id="notification-preferences-root" className="relative flex h-[100svh] min-h-[100svh] flex-col overflow-hidden px-4 pt-6 pb-24 text-[var(--foreground)] sm:px-6">
      <main className="mx-auto flex min-h-0 w-full max-w-xl flex-1 items-center overflow-y-auto overscroll-contain py-4">
        <section className="glass-panel my-auto w-full rounded-3xl p-6 sm:p-8" aria-labelledby="notification-question">
          <h1 id="notification-question" className="text-2xl font-bold leading-snug">New study notifications</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            Choose how you’d like to hear about new humor studies. Reminders arrive daily at noon Eastern while an active public study is available.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Text messages and calls require a verified phone number. Choosing Yes for texts or calls may also require a verification code. Automated text reminders are sent at most once daily. Reply STOP to stop texts or HELP for help. Message and data rates may apply.
          </p>
          {message ? <p role="alert" className="mt-4 text-sm text-[var(--error-text)]">{message}</p> : null}
          <NotificationPreferencesForm
            initialValues={{
              email: profile?.notify_new_study_email ?? null,
              sms: profile?.notify_new_study_sms ?? null,
              phoneCall: profile?.notify_new_study_phone_call ?? null,
            }}
            next={next}
            phoneState={phoneState}
          />
        </section>
      </main>
      <AccountMenu displayName={displayName} email={user.email} signOutAction={signOut} />
    </div>
  );
}
