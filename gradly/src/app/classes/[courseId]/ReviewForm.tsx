"use client";

import { useState, useTransition, FormEvent } from "react";
import { submitReview, updateGrade, type ReviewInput } from "./actions";

const GRADE_OPTIONS = [
  "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D+", "D", "D-",
  "F", "W", "I", "P",
];

export type ExistingReview = {
  stars:          number;
  semester_taken: string | null;
  professor_name: string | null;
  difficulty:     number | null;
  workload:       number | null;
  review_text:    string | null;
};

type Props = {
  courseId:       string;
  hasTaken:       boolean;         // user has this course as 'completed'
  currentGrade:   string | null;   // existing grade in user_courses
  existingReview: ExistingReview | null;
};

export default function ReviewForm({
  courseId,
  hasTaken,
  currentGrade,
  existingReview,
}: Props) {
  const isEdit = existingReview !== null;

  const [stars,         setStars]         = useState<number>(existingReview?.stars ?? 0);
  const [semesterTaken, setSemesterTaken] = useState(existingReview?.semester_taken ?? "");
  const [professor,     setProfessor]     = useState(existingReview?.professor_name ?? "");
  const [difficulty,    setDifficulty]    = useState<number>(existingReview?.difficulty ?? 0);
  const [workload,      setWorkload]      = useState<number>(existingReview?.workload ?? 0);
  const [reviewText,    setReviewText]    = useState(existingReview?.review_text ?? "");
  const [grade,         setGrade]         = useState(currentGrade ?? "");

  const [message,  setMessage]  = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (stars < 1) { setMessage("Please select a star rating."); return; }

    const input: ReviewInput = {
      stars,
      semester_taken: semesterTaken || undefined,
      professor_name: professor     || undefined,
      difficulty:     difficulty > 0 ? difficulty : null,
      workload:       workload   > 0 ? workload   : null,
      review_text:    reviewText || undefined,
    };

    setMessage(null);
    startTransition(async () => {
      // Submit review
      const reviewResult = await submitReview(courseId, input);
      if (reviewResult.error) { setMessage(`Error: ${reviewResult.error}`); return; }

      // Update grade if user has taken the class
      if (hasTaken) {
        const gradeResult = await updateGrade(courseId, grade || null);
        if (gradeResult.error) { setMessage(`Review saved, but grade error: ${gradeResult.error}`); return; }
      }

      setMessage(isEdit ? "Review updated." : "Review submitted. Thank you!");
    });
  }

  if (!hasTaken && !isEdit) {
    return (
      <p>
        <em>
          Only students who have completed this class can leave a review.
          Add it to a past semester in your{" "}
          <a href="/planning">planning page</a> first.
        </em>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>{isEdit ? "Edit Your Review" : "Leave a Review"}</h3>

      {/* Grade (only if user has the class recorded) */}
      {hasTaken && (
        <div>
          <label htmlFor="grade-input">Your Grade (optional)</label>
          <br />
          <select
            id="grade-input"
            value={grade}
            onChange={e => setGrade(e.target.value)}
          >
            <option value="">—</option>
            {GRADE_OPTIONS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stars */}
      <div>
        <label>Overall Rating *</label>
        <br />
        {[1, 2, 3, 4, 5].map(n => (
          <label key={n} style={{ marginRight: "0.5rem" }}>
            <input
              type="radio"
              name="stars"
              value={n}
              checked={stars === n}
              onChange={() => setStars(n)}
            />
            {" "}{n}★
          </label>
        ))}
      </div>

      {/* Semester taken */}
      <div>
        <label htmlFor="sem-taken">Semester Taken (optional)</label>
        <br />
        <input
          id="sem-taken"
          type="text"
          value={semesterTaken}
          onChange={e => setSemesterTaken(e.target.value)}
          placeholder="e.g. Fall 2024"
        />
      </div>

      {/* Professor */}
      <div>
        <label htmlFor="professor">Professor (optional)</label>
        <br />
        <input
          id="professor"
          type="text"
          value={professor}
          onChange={e => setProfessor(e.target.value)}
          placeholder="e.g. Dr. Smith"
        />
      </div>

      {/* Difficulty */}
      <div>
        <label>Difficulty (optional)</label>
        <br />
        {[0, 1, 2, 3, 4, 5].map(n => (
          <label key={n} style={{ marginRight: "0.5rem" }}>
            <input
              type="radio"
              name="difficulty"
              value={n}
              checked={difficulty === n}
              onChange={() => setDifficulty(n)}
            />
            {" "}{n === 0 ? "—" : n}
          </label>
        ))}
      </div>

      {/* Workload */}
      <div>
        <label>Workload (optional)</label>
        <br />
        {[0, 1, 2, 3, 4, 5].map(n => (
          <label key={n} style={{ marginRight: "0.5rem" }}>
            <input
              type="radio"
              name="workload"
              value={n}
              checked={workload === n}
              onChange={() => setWorkload(n)}
            />
            {" "}{n === 0 ? "—" : n}
          </label>
        ))}
      </div>

      {/* Review text */}
      <div>
        <label htmlFor="review-text">Review (optional)</label>
        <br />
        <textarea
          id="review-text"
          value={reviewText}
          onChange={e => setReviewText(e.target.value)}
          rows={4}
          placeholder="Share your experience…"
        />
      </div>

      <br />
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : isEdit ? "Update Review" : "Submit Review"}
      </button>

      {message && <p>{message}</p>}
    </form>
  );
}
