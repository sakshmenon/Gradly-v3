"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReviewFormOverlay from "./ReviewFormOverlay";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReviewDisplay = {
  id: string;
  user_id: string;
  stars: number;
  semester_taken: string | null;
  professor_name: string | null;
  difficulty: number | null;
  workload: number | null;
  review_text: string | null;
  created_at: string;
  display_name: string | null;
};

export type ClassInfoData = {
  course_id: string;
  title: string;
  credits: number;
  subject: string;
  description: string | null;
};

export type GradeStats = {
  avgGpa: string | null;
  gradeCounts: Record<string, number>;
  totalGradeEntries: number;
  sortedGrades: string[];
};

export type ReviewStats = {
  avgStars: number;
  avgDifficulty: number | null;
  avgWorkload: number | null;
  totalReviews: number;
};

export type ClassInfoClientProps = {
  courseId: string;
  cls: ClassInfoData;
  hasTaken: boolean;
  currentGrade: string | null;
  gradeStats: GradeStats;
  reviews: ReviewDisplay[];
  reviewStats: ReviewStats;
  existingReview: {
    stars: number;
    semester_taken: string | null;
    professor_name: string | null;
    difficulty: number | null;
    workload: number | null;
    review_text: string | null;
  } | null;
};

// ── Grade order for display ───────────────────────────────────────────────────

const GRADE_ORDER = [
  "A", "A-", "B+", "B", "B-",
  "C+", "C", "C-", "D+", "D", "D-",
  "F", "W", "I", "P",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClassInfoClient({
  courseId,
  cls,
  hasTaken,
  currentGrade,
  gradeStats,
  reviews,
  reviewStats,
  existingReview,
}: ClassInfoClientProps) {
  const [isReviewOverlayOpen, setIsReviewOverlayOpen] = useState(false);
  const router = useRouter();

  const canLeaveReview = hasTaken || existingReview !== null;

  function handleReviewSuccess() {
    setIsReviewOverlayOpen(false);
    router.refresh();
  }

  useEffect(() => {
    if (!isReviewOverlayOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsReviewOverlayOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isReviewOverlayOpen]);

  const initial = cls.course_id.slice(0, 2).toUpperCase();

  return (
    <div className="relative h-full w-full flex flex-col px-20 pt-16 overflow-y-auto scrollbar-hide">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <section className="flex items-center gap-10 pb-10 flex-shrink-0">
        <div className="w-32 h-32 rounded-full border border-gray-800 flex items-center justify-center bg-gray-900/20 flex-shrink-0">
          <span className="text-3xl font-bold tracking-tighter">{initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-gray-600 text-[10px] tracking-[0.5em] uppercase mb-2">
            Course_Registry
          </p>
          <h1 className="text-4xl font-bold tracking-tight uppercase italic mb-2">
            {cls.course_id}
          </h1>
          <p className="text-gray-500 text-sm tracking-wider">
            {cls.title}
          </p>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-600 tracking-wider">
            <span>{cls.subject}</span>
            <span>·</span>
            <span>{cls.credits} credits</span>
          </div>
          {cls.description && (
            <p className="text-gray-600 text-xs mt-3 leading-relaxed max-w-2xl">
              {cls.description}
            </p>
          )}
        </div>
      </section>

      <div className="w-full h-px bg-gray-900 flex-shrink-0" />

      {/* ── Content sections ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-12 pt-12 pb-20">

        {/* Grade Statistics */}
        <section>
          <h3 className="text-gray-600 text-[10px] tracking-[0.5em] uppercase mb-4">
            Grade_Statistics
          </h3>
          {gradeStats.totalGradeEntries === 0 ? (
            <div className="border border-gray-900 rounded-xl p-6 bg-gray-950/40">
              <p className="text-[10px] text-gray-700 tracking-widest uppercase">No grade data recorded yet</p>
            </div>
          ) : (
            <div className="border border-gray-900 rounded-xl p-6 bg-gray-950/40 flex flex-col gap-4">
              {gradeStats.avgGpa && (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{gradeStats.avgGpa}</span>
                  <span className="text-[10px] text-gray-600 tracking-wider">/ 4.0 avg GPA</span>
                  <span className="text-[9px] text-gray-700">({gradeStats.totalGradeEntries} grade{gradeStats.totalGradeEntries !== 1 ? "s" : ""})</span>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {gradeStats.sortedGrades.map((g) => {
                  const count = gradeStats.gradeCounts[g];
                  const pct = Math.round((count / gradeStats.totalGradeEntries) * 100);
                  return (
                    <span key={g} className="text-[10px] text-gray-500 tracking-wider border border-gray-800 px-2 py-1">
                      {g}: {count} ({pct}%)
                    </span>
                  );
                })}
                {Object.entries(gradeStats.gradeCounts)
                  .filter(([g]) => !GRADE_ORDER.includes(g))
                  .map(([g, count]) => (
                    <span key={g} className="text-[10px] text-gray-500 tracking-wider border border-gray-800 px-2 py-1">
                      {g}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* Review Statistics + Reviews */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-600 text-[10px] tracking-[0.5em] uppercase">
              Student_Reviews
            </h3>
            {canLeaveReview && (
              <button
                type="button"
                onClick={() => setIsReviewOverlayOpen(true)}
                className="px-6 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-green-500 transition-colors"
              >
                {existingReview ? "Edit Review" : "Leave a Review"}
              </button>
            )}
          </div>

          {/* Review stats bar */}
          {reviews.length > 0 && (
            <div className="border border-gray-900 rounded-xl p-6 bg-gray-950/40 mb-6 flex flex-wrap gap-8">
              <div>
                <span className="text-3xl font-bold text-white">{reviewStats.avgStars.toFixed(1)}</span>
                <span className="text-[10px] text-gray-600 tracking-wider ml-2">avg stars</span>
              </div>
              {reviewStats.avgDifficulty != null && (
                <div>
                  <span className="text-xl font-bold text-gray-300">{reviewStats.avgDifficulty.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-600 tracking-wider ml-2">avg difficulty</span>
                </div>
              )}
              {reviewStats.avgWorkload != null && (
                <div>
                  <span className="text-xl font-bold text-gray-300">{reviewStats.avgWorkload.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-600 tracking-wider ml-2">avg workload</span>
                </div>
              )}
              <div>
                <span className="text-[10px] text-gray-500 tracking-wider">{reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <div className="border border-gray-900 rounded-xl p-8 bg-gray-950/40">
              <p className="text-[10px] text-gray-700 tracking-widest uppercase text-center mb-4">
                No reviews yet
              </p>
              <p className="text-gray-600 text-xs text-center tracking-wider">
                {canLeaveReview ? "Be the first to leave a review." : "Only students who have completed this class can leave a review. Add it to a past semester in your planning page first."}
              </p>
              {canLeaveReview && (
                <div className="flex justify-center mt-6">
                  <button
                    type="button"
                    onClick={() => setIsReviewOverlayOpen(true)}
                    className="px-8 py-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-green-500 transition-colors"
                  >
                    Leave a Review
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="border border-gray-900 rounded-xl p-6 bg-gray-950/40 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-green-500 text-sm">
                        {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
                      </span>
                      <span className="text-[10px] text-gray-500 tracking-wider ml-3">
                        by {r.display_name ?? "Anonymous"}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-700 tracking-widest shrink-0">
                      {r.semester_taken ?? "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[9px] text-gray-600">
                    {r.professor_name && (
                      <span className="tracking-wider">Prof: {r.professor_name}</span>
                    )}
                    {r.difficulty != null && r.difficulty > 0 && (
                      <span>Difficulty: {r.difficulty}/5</span>
                    )}
                    {r.workload != null && r.workload > 0 && (
                      <span>Workload: {r.workload}/5</span>
                    )}
                  </div>
                  {r.review_text && (
                    <p className="text-gray-400 text-xs leading-relaxed tracking-wider">
                      {r.review_text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Back link */}
        <Link
          href="/planning"
          className="text-[10px] text-gray-600 hover:text-white tracking-[0.5em] uppercase transition-colors self-start"
        >
          ← Back to Planning
        </Link>
      </div>

      {/* ── Review overlay ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isReviewOverlayOpen && (
          <ReviewFormOverlay
            courseId={courseId}
            hasTaken={hasTaken}
            currentGrade={currentGrade}
            existingReview={existingReview}
            onClose={() => setIsReviewOverlayOpen(false)}
            onSuccess={handleReviewSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
