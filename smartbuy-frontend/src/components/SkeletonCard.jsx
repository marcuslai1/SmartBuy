/**
 * SkeletonCard - Loading placeholder for phone cards
 *
 * Displays an animated skeleton while phone data is loading.
 * Uses shimmer animation for a polished loading experience.
 */
import { motion } from "framer-motion";

function SkeletonCard() {
  // Shimmer animation config
  const shimmer = {
    initial: { backgroundPosition: "-200% 0" },
    animate: {
      backgroundPosition: "200% 0",
      transition: { repeat: Infinity, duration: 1.5, ease: "linear" },
    },
  };

  const shimmerClass =
    "rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm min-h-[280px] overflow-hidden">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <motion.div
            {...shimmer}
            className={`h-5 w-16 rounded-full ${shimmerClass}`}
          />
          <motion.div
            {...shimmer}
            className={`h-5 w-12 rounded-full ${shimmerClass}`}
          />
        </div>
        <motion.div
          {...shimmer}
          className={`h-5 w-10 rounded ${shimmerClass}`}
        />
      </div>

      {/* Body content */}
      <div className="p-4">
        {/* Title skeleton - two lines */}
        <motion.div
          {...shimmer}
          className={`h-5 w-4/5 mb-2 ${shimmerClass}`}
        />
        <motion.div
          {...shimmer}
          className={`h-5 w-3/5 mb-4 ${shimmerClass}`}
        />

        {/* Quick specs skeleton */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <motion.div
            {...shimmer}
            className={`h-5 w-20 rounded ${shimmerClass}`}
          />
          <motion.div
            {...shimmer}
            className={`h-5 w-16 rounded ${shimmerClass}`}
          />
          <motion.div
            {...shimmer}
            className={`h-5 w-18 rounded ${shimmerClass}`}
          />
        </div>

        {/* Price link skeleton */}
        <motion.div
          {...shimmer}
          className={`h-14 w-full rounded-lg mb-3 ${shimmerClass}`}
        />

        {/* Score badges skeleton */}
        <div className="flex items-center gap-2">
          <motion.div
            {...shimmer}
            className={`h-7 w-28 rounded ${shimmerClass}`}
          />
          <motion.div
            {...shimmer}
            className={`h-7 w-32 rounded ${shimmerClass}`}
          />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;
