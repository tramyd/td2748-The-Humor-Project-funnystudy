import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { AccountMenu } from "@/components/AccountMenu";
import { CrackdHome } from "@/components/CrackdHome";
import { LocalDateTime } from "@/components/LocalDateTime";
import { SubmitButton } from "@/components/SubmitButton";
import { StudyQuestionForm } from "@/components/StudyQuestionForm";
import { ThemeMenu } from "@/components/theme/ThemeMenu";
import { buildDemographicsPath, hasPendingDemographicQuestions } from "@/lib/demographics";
import { DEMOGRAPHIC_SKIPS_COOKIE, readDemographicSkips } from "@/lib/demographic-skips";
import { buildNotificationPreferencesPath, fetchNotificationPreferences, NOTIFICATION_SKIPS_COOKIE, readNotificationSkips } from "@/lib/notification-preferences";
import { fetchPublicActiveStudyIdentities } from "@/lib/studies";
import { createClient } from "@/lib/supabase/server";
import { fetchCompletedStudyHistory, fetchStudyParticipations, isStudyCompleted } from "@/lib/study-participation";
import type { TablesUpdate } from "@/types/supabase";

type Profile = {
  first_name: string | null;
  last_name: string | null;
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolvedParams = (await searchParams) ?? {};
  const messageRaw = resolvedParams.message;
  const message = Array.isArray(messageRaw) ? messageRaw[0] : messageRaw;

  const supabase = await createClient();
  const studyNow = new Date();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const skippedNotifications = readNotificationSkips(cookieStore.get(NOTIFICATION_SKIPS_COOKIE)?.value, user.id);
  if ((await fetchNotificationPreferences(supabase, user.id, skippedNotifications)).pending.length) {
    redirect(buildNotificationPreferencesPath("/"));
  }

  const skippedQuestionIds = readDemographicSkips(
    cookieStore.get(DEMOGRAPHIC_SKIPS_COOKIE)?.value,
    user.id
  );

  if (await hasPendingDemographicQuestions(supabase, user.id, skippedQuestionIds)) {
    redirect(buildDemographicsPath({ next: "/", skippedQuestionIds }));
  }

  const [
    { data: profileData },
    { studies: activeStudyIdentities, error: activeStudyIdentitiesError },
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single(),
      fetchPublicActiveStudyIdentities(supabase, studyNow),
    ]);

  const profile = profileData as Profile | null;

  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const displayName = fullName || user.email || "your account";

  if (!profile?.first_name || !profile?.last_name) {
    return (
      <CompleteProfileForm
        userEmail={user.email}
        initialFirst={profile?.first_name ?? ""}
        initialLast={profile?.last_name ?? ""}
        message={message}
      />
    );
  }

  if (activeStudyIdentitiesError) {
    console.error("[Home] load active study identities failed", activeStudyIdentitiesError);
  }

  const { participations, error: participationError } = await fetchStudyParticipations(
    supabase, user.id, activeStudyIdentities.map((study) => study.id)
  );
  const participationByStudy = new Map(participations.map((row) => [row.study_id, row]));
  if (participationError) {
    console.error("[Home] load study participation failed", participationError);
  }

  const pastStudyHistory = activeStudyIdentities.length === 0 && !activeStudyIdentitiesError
    ? await fetchCompletedStudyHistory(supabase, user.id)
    : null;
  if (pastStudyHistory?.error) {
    console.error("[Home] load completed study history failed", pastStudyHistory.error);
  }

  return (
    <div
      id="home-root"
      className="crackd-page relative flex h-[100svh] min-h-[100svh] flex-col overflow-hidden px-4 pt-8 pb-24 text-[var(--foreground)] sm:px-6 sm:pt-12"
    >
      <main
        id="home-content"
        className="relative mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto overscroll-contain p-1"
      >
        {activeStudyIdentitiesError ? (
          <div className="glass-panel rounded-2xl p-6 text-center sm:p-8">
            <h1 className="text-2xl font-bold text-[var(--error-text)]">
              We couldn&apos;t load studies
            </h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Please refresh and try again.
            </p>
          </div>
        ) : activeStudyIdentities.length === 0 ? (
          <div className="space-y-5 pb-4">
            <section className="glass-panel rounded-2xl p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--soft)]">
                Humor Study
              </p>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">No active studies right now</h1>
              <p className="mt-3 leading-7 text-[var(--muted)]">
                There aren&apos;t any public studies available at the moment. You can
                come back later or manage optional new-study notifications in{" "}
                <Link
                  href="/settings"
                  className="font-semibold text-[var(--foreground)] underline underline-offset-2"
                >
                  Settings
                </Link>
                .
              </p>
            </section>

            <section
              aria-labelledby="study-purpose-heading"
              className="glass-panel rounded-2xl p-6 sm:p-8"
            >
              <h2 id="study-purpose-heading" className="text-xl font-bold sm:text-2xl">
                About this study
              </h2>
              <p className="mt-3 leading-7 text-[var(--muted)]">
                Humor Study is part of academic research at Columbia University.
                Participants view image-and-caption pairs and mark captions they
                find funny. The goal is to learn more about how people respond to
                humor; after completing a study, you can review a summary of your
                activity.
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Participation is voluntary. This overview is not a research
                consent form. See the{" "}
                <Link href="/terms" className="underline underline-offset-2">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline underline-offset-2">
                  Privacy Policy
                </Link>{" "}
                for more information.
              </p>
            </section>

            <section
              aria-labelledby="past-studies-heading"
              className="glass-panel rounded-2xl p-6 sm:p-8"
            >
              <h2 id="past-studies-heading" className="text-xl font-bold sm:text-2xl">
                Your past studies
              </h2>
              {pastStudyHistory?.error ? (
                <p role="alert" className="mt-3 text-sm text-[var(--error-text)]">
                  We couldn&apos;t load your past studies. Please refresh to try again.
                </p>
              ) : pastStudyHistory?.participations.length ? (
                <ul className="mt-4 space-y-3">
                  {pastStudyHistory.participations.map((participation) => (
                    <li key={participation.study_id}>
                      <Link
                        href={`/study/${participation.study_id}`}
                        prefetch={false}
                        className="glass-panel flex items-center justify-between gap-4 rounded-xl p-4 transition hover:border-[var(--accent)] hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]"
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            Study {participation.study_id}
                          </span>
                          {participation.studies[0]?.description ? (
                            <span className="mt-1 block text-sm text-[var(--muted)]">
                              {participation.studies[0].description}
                            </span>
                          ) : null}
                          {participation.ended_at ? (
                            <span className="mt-1 block text-sm text-[var(--muted)]">
                              Completed{" "}
                              <LocalDateTime value={participation.ended_at} />
                            </span>
                          ) : null}
                        </span>
                        <ArrowRightIcon
                          aria-hidden
                          className="h-5 w-5 shrink-0 text-[var(--accent-strong)]"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 leading-7 text-[var(--muted)]">
                  Completed studies will appear here.
                </p>
              )}
            </section>

            <section
              aria-labelledby="study-faq-heading"
              className="glass-panel rounded-2xl p-6 sm:p-8"
            >
              <h2 id="study-faq-heading" className="text-xl font-bold sm:text-2xl">
                Frequently asked questions
              </h2>
              <div className="mt-4 space-y-3">
                <details className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4">
                  <summary className="cursor-pointer font-semibold">
                    How do I take part in a study?
                  </summary>
                  <p className="mt-3 leading-6 text-[var(--muted)]">
                    When a public study is active, it will appear on this page.
                    Open it to review captions and like the ones you find funny.
                  </p>
                </details>
                <details className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4">
                  <summary className="cursor-pointer font-semibold">
                    Can I revisit a completed study?
                  </summary>
                  <p className="mt-3 leading-6 text-[var(--muted)]">
                    Yes. Select a study under Your past studies to reopen its
                    saved completion summary.
                  </p>
                </details>
                <details className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] p-4">
                  <summary className="cursor-pointer font-semibold">
                    How can I ask another question?
                  </summary>
                  <p className="mt-3 leading-6 text-[var(--muted)]">
                    Write your question below. We&apos;ll prepare an email for you
                    to review and send.
                  </p>
                </details>
              </div>
              <div className="mt-6 border-t border-[var(--panel-border)] pt-6">
                <h3 className="text-lg font-semibold">Still have a question?</h3>
                <p className="mt-2 mb-4 text-sm leading-6 text-[var(--muted)]">
                  Send a question to the study team.
                </p>
                <StudyQuestionForm userEmail={user.email} />
              </div>
            </section>
          </div>
        ) : (
          <CrackdHome studyId={activeStudyIdentities[0]?.id} />
        )}
      </main>
      <AccountMenu displayName={displayName} email={user.email} signOutAction={signOut} />
    </div>
  );
}

function CompleteProfileForm({
  userEmail,
  initialFirst,
  initialLast,
  message,
}: {
  userEmail: string | undefined | null;
  initialFirst: string;
  initialLast: string;
  message?: string | null;
}) {
  return (
    <div
      id="profile-complete-root"
      className="relative flex h-[100svh] min-h-[100svh] items-start justify-center overflow-hidden px-4 py-10 text-[var(--foreground)] sm:items-center sm:px-6 sm:py-16"
    >
      <div
        id="profile-bg-shell"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          id="profile-bg-orb-1"
          className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-amber-500/25 blur-[110px] animate-orb"
        />
        <div
          id="profile-bg-orb-2"
          className="absolute bottom-6 right-8 h-56 w-56 rounded-full bg-yellow-300/20 blur-[110px] animate-orb-reverse"
        />
        <div
          id="profile-bg-orb-3"
          className="absolute left-12 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full bg-amber-300/20 blur-[100px] animate-orb-sway"
        />
        <div
          id="profile-bg-grid"
          className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.12),transparent_42%),radial-gradient(circle_at_80%_12%,rgba(253,224,71,0.12),transparent_35%)] animate-grid-drift"
        />
      </div>

      <div
        id="profile-complete-card"
        className="relative w-full max-w-2xl rounded-3xl border border-[var(--panel-border)] bg-[var(--card-surface)] p-8 shadow-[var(--panel-shadow)] backdrop-blur-sm animate-card-rise sm:p-10 max-h-[calc(100svh-4rem)] overflow-y-auto sm:max-h-none"
      >
        <div
          id="profile-card-topline"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[var(--accent)] animate-shine"
        />
        <div
          id="profile-card-topglow"
          className="absolute -left-16 top-0 h-28 w-28 rounded-full bg-amber-500/15 blur-3xl"
        />
        <div id="profile-card-body" className="space-y-7 relative">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--soft)]">
              Welcome
            </p>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
              <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-yellow-200 bg-clip-text text-transparent animate-text-shimmer">
                Tell us who you are
              </span>
            </h1>
            <p className="text-sm text-[var(--muted)] sm:text-base">
              We need your first and last name before you can enter. You&apos;re
              signed in as {userEmail ?? "your account"}.
            </p>
            {message ? (
              <p className="rounded-xl bg-[color-mix(in_srgb,_var(--accent)_12%,_transparent)] px-4 py-3 text-sm font-medium text-[var(--foreground)] ring-1 ring-[color-mix(in_srgb,_var(--accent)_35%,_transparent)]">
                {message}
              </p>
            ) : null}
          </header>

          <form id="profile-name-form" action={updateProfileName} className="space-y-4">
            <div id="profile-name-grid" className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                First name
                <input
                  name="first_name"
                  defaultValue={initialFirst}
                  required
                  minLength={2}
                  className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--foreground)] shadow-inner outline-none ring-1 ring-[var(--input-border)] transition focus:ring-2 focus:ring-[var(--input-ring)]"
                  placeholder="Jane"
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                Last name
                <input
                  name="last_name"
                  defaultValue={initialLast}
                  required
                  minLength={2}
                  className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--foreground)] shadow-inner outline-none ring-1 ring-[var(--input-border)] transition focus:ring-2 focus:ring-[var(--input-ring)]"
                  placeholder="Doe"
                />
              </label>
            </div>
            <div
              id="profile-action-row"
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end"
            >
              <SubmitButton
                formAction={updateProfileName}
                pendingLabel="Saving…"
                className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-contrast)] shadow-lg shadow-[0_15px_40px_-20px_rgba(245,158,11,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] sm:w-auto"
              >
                Save and continue
              </SubmitButton>
              <SubmitButton
                pendingLabel="Signing out…"
                formAction={signOut}
                formNoValidate
                className="w-full rounded-xl border border-[var(--panel-border)] bg-[var(--surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] shadow-inner shadow-black/40 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--panel-border)] sm:w-auto"
              >
                Log out
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
      <ThemeMenu />
    </div>
  );
}

async function signOut() {
  "use server";

  const supabase = await createClient({ allowCookieWrite: true });
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

async function updateProfileName(formData: FormData) {
  "use server";

  const supabase = await createClient({ allowCookieWrite: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const first = formData.get("first_name")?.toString().trim() ?? "";
  const last = formData.get("last_name")?.toString().trim() ?? "";

  if (first.length < 2 || last.length < 2) {
    redirect(
      "/?message=" + encodeURIComponent("Please enter a valid first and last name.")
    );
  }

  const updatePayload: TablesUpdate<"profiles"> = {
    first_name: first,
    last_name: last,
    modified_by_user_id: user.id,
  };
  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    redirect(
      "/?message=" +
        encodeURIComponent("We could not save your name. Please try again.")
    );
  }

  redirect("/");
}
