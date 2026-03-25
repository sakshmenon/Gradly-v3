"use client";

import { useState, useTransition, FormEvent } from "react";
import { motion } from "framer-motion";
import { submitReview, updateGrade, type ReviewInput } from "./actions";

const GRADE_OPTIONS = [
  "A", "A-", "B+", "B", "B-",
  "C+", "C", "C-", "D+", "D", "D-",
  "F", "W", "I", "P",
];

const inputCls =
  "w-full bg-transparent border-b border-gray-800 py-2 outline-none " +
  "focus:border-green-500 transition-colors placeholder:text-gray-800 text-sm text-gray-300";

const selectCls =
  "w-full bg-transparent border-b border-gray-800 py-2 outline-none " +
  "focus:border-green-500 transition-colors text-sm text-gray-300";

type Props = {
  courseId: string;
  hasTaken: boolean;
  currentGrade: string | null;
  existingReview: {
    stars: number;
    semester_taken: string | null;
    professor_name: string | null;
    difficulty: number | null;
    workload: number | null;
    review_text: string | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReviewFormOverlay({
  courseId,
  hasTaken,
  currentGrade,
  existingReview,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = existingReview !== null;

  const [stars,         setStars]         = useState(existingReview?.stars ?? 0);
  const [semesterTaken, setSemesterTaken] = useState(existingReview?.semester_taken ?? "");
  const [professor,     setProfessor]     = useState(existingReview?.professor_name ?? "");
  const [difficulty,    setDifficulty]    = useState(existingReview?.difficulty ?? 0);
  const [workload,      setWorkload]      = useState(existingReview?.workload ?? 0);
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
      professor_name: professor || undefined,
      difficulty: difficulty > 0 ? difficulty : null,
      workload: workload > 0 ? workload : null,
      review_text: reviewText || undefined,
    };

    setMessage(null);
    startTransition(async () => {
      const reviewResult = await submitReview(courseId, input);
      if (reviewResult.error) { setMessage(`Error: ${reviewResult.error}`); return; }

      if (hasTaken) {
        const gradeResult = await updateGrade(courseId, grade || null);
        if (gradeResult.error) { setMessage(`Review saved, but grade error: ${gradeResult.error}`); return; }
      }

      setMessage(isEdit ? "Review updated." : "Review submitted. Thank you!");
      setTimeout(onSuccess, 800);
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-[500px] max-h-[90vh] flex flex-col bg-gray-950 border border-gray-800 rounded-xl p-10 shadow-2xl overflow-y-auto scrollbar-hide"
      >
        <h2 className="text-xl font-bold tracking-widest uppercase mb-6 text-white">
          {isEdit ? "Edit_Review" : "Leave_A_Review"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Stars (required) */}
          <div>
            <label className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">
              Overall Rating *
            </label>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  className={`w-10 h-10 rounded border flex items-center justify-center text-sm transition-colors ${
                    stars === n
                      ? "border-green-500 bg-green-500/20 text-green-500"
                      : "border-gray-800 text-gray-500 hover:border-gray-600"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Grade (if has taken) */}
          {hasTaken && (
            <div>
              <label htmlFor="grade-input" className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">
                Your Grade (optional)
              </label>
              <select
                id="grade-input"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className={selectCls}
              >
                <option value="">—</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          {/* Semester taken */}
          <div>
            <label htmlFor="sem-taken" className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">
              Semester Taken (optional)
            </label>
            <input
              id="sem-taken"
              type="text"
              value={semesterTaken}
              onChange={(e) => setSemesterTaken(e.target.value)}
              placeholder="e.g. Fall 2024"
              className={inputCls}
            />
          </div>

          {/* Professor */}
          <div>
            <label htmlFor="professor" className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">
              Professor (optional)
            </label>
            <input
              id="professor"
              type="text"
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              placeholder="e.g. Dr. Smith"
              className={inputCls}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">
              Difficulty (optional)
            </label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDifficulty(n)}
                  className={`w-8 h-8 rounded border text-[10px] transition-colors ${
                    difficulty === n
                      ? "border-green-500 bg-green-500/20 text-green-500"
                      : "border-gray-800 text-gray-500 hover:border-gray-600"
                  }`}
                >
                  {n === 0 ? "—" : n}
                </button>
              ))}
            </div>
          </div>

          {/* Workload */}
          <div>
            <label className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">
              Workload (optional)
            </label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWorkload(n)}
                  className={`w-8 h-8 rounded border text-[10px] transition-colors ${
                    workload === n
                      ? "border-green-500 bg-green-500/20 text-green-500"
                      : "border-gray-800 text-gray-500 hover:border-gray-600"
                  }`}
                >
                  {n === 0 ? "—" : n}
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <div>
            <label htmlFor="review-text" className="block text-[9px] text-gray-700 uppercase mb-2 tracking-widest">
              Review (optional)
            </label>
            <textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              placeholder="Share your experience…"
              className={`${inputCls} border rounded-lg p-3 resize-none`}
            />
          </div>

          {message && (
            <p className={`text-[10px] tracking-widest ${message.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
              {message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-8 py-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-green-500 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving…" : isEdit ? "Update" : "Submit"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 border border-gray-800 text-gray-500 text-[10px] tracking-widest hover:border-gray-600 hover:text-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
