"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { updateProfile, sendPasswordResetEmail } from "./actions";
import { AVAILABLE_MAJORS } from "@/lib/utils/planning";

type ProfileData = {
  display_name:        string | null;
  email:               string;
  major:               string | null;
  starting_semester:   string | null;
  expected_graduation: string | null;
  gpa:                 number | null;
};

function generateSemesters(): string[] {
  const currentYear = new Date().getFullYear();
  const terms = ["Spring", "Summer", "Fall"];
  const semesters: string[] = [];
  for (let year = currentYear - 6; year <= currentYear + 8; year++) {
    for (const term of terms) {
      semesters.push(`${term} ${year}`);
    }
  }
  return semesters;
}

const SEMESTERS = generateSemesters();

// ── Shared field style tokens ─────────────────────────────────────────────────

const inputCls =
  "w-full bg-transparent border-b border-gray-900 py-2 outline-none " +
  "focus:border-green-500 transition-colors placeholder:text-gray-800 text-sm text-gray-300";

const selectCls =
  "w-full bg-transparent border-b border-gray-900 py-2 outline-none " +
  "focus:border-green-500 transition-colors text-sm text-gray-300";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProfileForm({ profile }: { profile: ProfileData }) {
  const [saveMessage,   setSaveMessage]   = useState<string | null>(null);
  const [pwMessage,     setPwMessage]     = useState<string | null>(null);
  const [isSavePending, startSaveTransition] = useTransition();
  const [isPwPending,   startPwTransition]   = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaveMessage(null);
    startSaveTransition(async () => {
      const result = await updateProfile(formData);
      setSaveMessage(result.error ? `Error: ${result.error}` : "Parameters_Saved.");
    });
  }

  function handlePasswordReset() {
    setPwMessage(null);
    startPwTransition(async () => {
      const result = await sendPasswordResetEmail();
      setPwMessage(
        result.error ? `Error: ${result.error}` : "Reset_Link_Dispatched."
      );
    });
  }

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* Profile fields + save — separate from sign-out form so <form> is not nested */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 flex-1 min-h-0"
      >
      {/* ── Editable fields ─────────────────────────────────────────────── */}
      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide pr-1">
        <Field label="Display_Name">
          <input
            name="display_name"
            type="text"
            defaultValue={profile.display_name ?? ""}
            placeholder="UNDEFINED"
            className={inputCls}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={profile.email}
            disabled
            readOnly
            className={`${inputCls} opacity-30 cursor-not-allowed`}
          />
        </Field>

        <Field label="Major">
          <select
            name="major"
            defaultValue={profile.major ?? ""}
            className={selectCls}
          >
            <option value="">-- UNDEFINED --</option>
            {AVAILABLE_MAJORS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>

        <Field label="Starting Semester">
          <select
            name="starting_semester"
            defaultValue={profile.starting_semester ?? ""}
            className={selectCls}
          >
            <option value="">-- UNDEFINED --</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Expected Graduation">
          <select
            name="expected_graduation"
            defaultValue={profile.expected_graduation ?? ""}
            className={selectCls}
          >
            <option value="">-- UNDEFINED --</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="GPA">
          <input
            name="gpa"
            type="number"
            step="0.01"
            min="0"
            max="4"
            defaultValue={profile.gpa?.toString() ?? ""}
            placeholder="0.00 – 4.00"
            className={inputCls}
          />
        </Field>
      </div>

      {/* ── Save ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 flex-shrink-0">
        {saveMessage && (
          <p
            className={`text-[9px] tracking-widest uppercase ${
              saveMessage.startsWith("Error") ? "text-red-400" : "text-green-400"
            }`}
          >
            {saveMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSavePending}
          className="w-full py-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-green-500 transition-colors disabled:opacity-50"
        >
          {isSavePending ? "SAVING..." : "SAVE_PARAMETERS"}
        </button>
      </div>
      </form>

      {/* ── Account actions (sibling forms — not nested) ─────────────────── */}
      <div className="flex flex-col gap-2 border-t border-gray-900 pt-3 flex-shrink-0 pb-2">
        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={isPwPending}
          className="text-[9px] text-gray-600 uppercase tracking-widest hover:text-gray-400 transition-colors text-left"
        >
          {isPwPending ? "Sending..." : "Reset_Password →"}
        </button>

        {pwMessage && (
          <p
            className={`text-[9px] tracking-widest uppercase ${
              pwMessage.startsWith("Error") ? "text-red-400" : "text-green-400"
            }`}
          >
            {pwMessage}
          </p>
        )}

        <Link
          href="/planning"
          className="text-[9px] text-gray-600 uppercase tracking-widest hover:text-gray-400 transition-colors"
        >
          Manage_Classes →
        </Link>

        <form action="/auth/signout" method="post" className="mt-1">
          <button
            type="submit"
            className="text-[9px] text-gray-700 uppercase tracking-widest hover:text-red-400 transition-colors"
          >
            [ Sign_Out ]
          </button>
        </form>
      </div>
    </div>
  );
}
