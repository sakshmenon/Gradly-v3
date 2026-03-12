"use client";

import { useState, useTransition, FormEvent } from "react";
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

export default function ProfileForm({ profile }: { profile: ProfileData }) {
  const [saveMessage,  setSaveMessage]  = useState<string | null>(null);
  const [pwMessage,    setPwMessage]    = useState<string | null>(null);
  const [isSavePending, startSaveTransition] = useTransition();
  const [isPwPending,   startPwTransition]   = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setSaveMessage(null);
    startSaveTransition(async () => {
      const result = await updateProfile(formData);
      setSaveMessage(result.error ? `Error: ${result.error}` : "Profile saved.");
    });
  }

  function handlePasswordReset() {
    setPwMessage(null);
    startPwTransition(async () => {
      const result = await sendPasswordResetEmail();
      setPwMessage(
        result.error
          ? `Error: ${result.error}`
          : "Password reset email sent — check your inbox."
      );
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="display_name">Name</label>
          <br />
          <input
            id="display_name"
            name="display_name"
            type="text"
            defaultValue={profile.display_name ?? ""}
            placeholder="Your full name"
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            value={profile.email}
            disabled
            readOnly
          />
        </div>

        <div>
          <label htmlFor="major">Major</label>
          <br />
          <select
            id="major"
            name="major"
            defaultValue={profile.major ?? ""}
          >
            <option value="">-- Select --</option>
            {AVAILABLE_MAJORS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="starting_semester">Starting Semester</label>
          <br />
          <select
            id="starting_semester"
            name="starting_semester"
            defaultValue={profile.starting_semester ?? ""}
          >
            <option value="">-- Select --</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="expected_graduation">Expected Graduation</label>
          <br />
          <select
            id="expected_graduation"
            name="expected_graduation"
            defaultValue={profile.expected_graduation ?? ""}
          >
            <option value="">-- Select --</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="gpa">GPA</label>
          <br />
          <input
            id="gpa"
            name="gpa"
            type="number"
            step="0.01"
            min="0"
            max="4"
            defaultValue={profile.gpa?.toString() ?? ""}
            placeholder="0.00 – 4.00"
          />
        </div>

        <br />
        <button type="submit" disabled={isSavePending}>
          {isSavePending ? "Saving…" : "Save Profile"}
        </button>
        {saveMessage && <p>{saveMessage}</p>}
      </form>

      <hr />

      <section>
        <h3>Password</h3>
        <button type="button" onClick={handlePasswordReset} disabled={isPwPending}>
          {isPwPending ? "Sending…" : "Send Password Reset Email"}
        </button>
        {pwMessage && <p>{pwMessage}</p>}
      </section>

      <hr />

      <section>
        <h3>Classes Taken</h3>
        <a href="/planning">Manage classes taken →</a>
      </section>
    </>
  );
}
