"use client";

import { useActionState, useState } from "react";

import { saveNotificationPreferences, verifyNotificationPhone } from "@/app/notification-preferences/actions";
import { PhoneSettingsState } from "@/lib/phone-settings";
import { PolicyLinks } from "./PolicyLinks";
import { SubmitButton } from "./SubmitButton";

type ActionState = { status: "idle" | "error"; message: string };
const initialState: ActionState = { status: "idle", message: "" };

type PreferenceValues = {
  email: boolean | null;
  sms: boolean | null;
  phoneCall: boolean | null;
};

export function NotificationPreferencesForm({
  initialValues,
  next,
  phoneState,
}: {
  initialValues: PreferenceValues;
  next: string;
  phoneState: PhoneSettingsState;
}) {
  const [saveState, saveAction, saving] = useActionState(saveNotificationPreferences, initialState);
  const [verifyState, verifyAction, verifying] = useActionState(verifyNotificationPhone, initialState);
  const [smsInterested, setSmsInterested] = useState(initialValues.sms === true);
  const [phoneCallInterested, setPhoneCallInterested] = useState(initialValues.phoneCall === true);
  const wantsPhone = smsInterested || phoneCallInterested;

  return (
    <>
      <form action={saveAction} className="mt-6 space-y-6">
        <input type="hidden" name="next" value={next} />
        {([
          ["email", "Email", "notify_new_study_email", initialValues.email],
          ["sms", "Text message", "notify_new_study_sms", initialValues.sms],
          ["phoneCall", "Phone call", "notify_new_study_phone_call", initialValues.phoneCall],
        ] as const).map(([key, label, fieldName, currentValue]) => (
          <fieldset key={fieldName} className="rounded-2xl border border-[var(--panel-border)] p-4">
            <legend className="px-1 font-semibold">{label}</legend>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Receive a new-study reminder by {label.toLowerCase()}?</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([ ["yes", "Yes", true], ["no", "No", false], ["skip", "Skip", null] ] as const).map(([choice, choiceLabel, value]) => (
                <label key={choice} className="cursor-pointer">
                  <input
                    type="radio"
                    name={fieldName}
                    value={choice}
                    defaultChecked={currentValue === value ? choice === "skip" || choice === (value ? "yes" : "no") : false}
                    onChange={key === "sms" && choice === "yes" ? () => setSmsInterested(true)
                      : key === "sms" && choice !== "yes" ? () => setSmsInterested(false)
                      : key === "phoneCall" && choice === "yes" ? () => setPhoneCallInterested(true)
                      : key === "phoneCall" && choice !== "yes" ? () => setPhoneCallInterested(false)
                      : undefined}
                    className="peer sr-only"
                  />
                  <span className="block rounded-xl border border-[var(--panel-border)] px-3 py-2 text-center text-sm font-semibold peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent-soft)]">{choiceLabel}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        {wantsPhone ? (
          <fieldset className="rounded-2xl border border-[var(--panel-border)] p-4">
            <legend className="px-1 font-semibold">Phone number</legend>
            <label className="block text-sm font-semibold">
              Phone number, including country code
              <input
                type="tel"
                name="phone"
                required={!phoneState.verifiedPhone}
                defaultValue={phoneState.pendingPhone || phoneState.verifiedPhone}
                placeholder="+12125551234"
                autoComplete="tel"
                className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--input-ring)]"
              />
            </label>
            {!phoneState.verifiedPhone ? (
              <label className="mt-3 flex items-start gap-3 text-sm leading-6 text-[var(--muted)]">
                <input type="checkbox" name="verification_sms_consent" value="on" required className="mt-1 h-4 w-4 accent-[var(--accent)]" />
                <span>I agree to receive an automated verification text at this number.</span>
              </label>
            ) : null}
          </fieldset>
        ) : null}
        <SubmitButton pendingLabel="Saving…" className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-[var(--accent-contrast)]">Save preferences</SubmitButton>
        <div className="min-h-6 text-sm" aria-live="polite">
          {saveState.message ? <p role="alert" className="text-[var(--error-text)]">{saveState.message}</p> : null}
        </div>
      </form>

      {phoneState.pendingPhone ? (
        <form action={verifyAction} className="mt-2 space-y-3">
          <input type="hidden" name="next" value={next} />
          <p className="text-sm text-[var(--muted)]">Enter the six-digit code sent to {phoneState.pendingPhone}.</p>
          <label className="block text-sm font-semibold">
            Verification code
            <input type="text" name="code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" minLength={6} maxLength={6}
              className="mt-2 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-base text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--input-ring)]" />
          </label>
          <SubmitButton pendingLabel="Verifying…" className="w-full rounded-xl border border-[var(--panel-border)] px-5 py-3 font-semibold">Verify phone number</SubmitButton>
          {verifyState.message ? <p role="alert" className="text-sm text-[var(--error-text)]">{verifyState.message}</p> : null}
        </form>
      ) : null}
      <p className="mt-5 text-sm text-[var(--muted)]"><PolicyLinks /></p>
      {(saving || verifying) ? null : null}
    </>
  );
}
