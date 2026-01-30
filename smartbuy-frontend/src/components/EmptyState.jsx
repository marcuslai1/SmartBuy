/**
 * EmptyState - Displayed when no phones match the current filters
 *
 * Provides a friendly message and optional reset action.
 */
import { motion } from "framer-motion";
import { SearchX, RefreshCw } from "lucide-react";

function EmptyState({
  title = "No Results Found",
  message = "No phones match your current filters.",
  onReset,
  resetLabel = "Reset Filters",
  icon: Icon = SearchX,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      {/* Icon container */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center mb-6 shadow-lg"
      >
        <Icon className="w-12 h-12 text-zinc-400" strokeWidth={1.5} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-2xl font-semibold text-white mb-2"
      >
        {title}
      </motion.h3>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-zinc-400 text-center max-w-md mb-8 leading-relaxed"
      >
        {message}
      </motion.p>

      {/* Reset button */}
      {onReset && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          {resetLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

export default EmptyState;
