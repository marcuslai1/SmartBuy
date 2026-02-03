/**
 * CompareView - Premium phone comparison panel with fullscreen mode
 *
 * Displays a slide-up panel for comparing 2-3 phones side by side.
 * Features score visualization, category winners, and fullscreen expansion.
 */
import { useState, useEffect } from "react";
// Note: useEffect is used for escape key handling
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trophy, TrendingUp, Scale, Maximize2, Minimize2, Award, Sparkles } from "lucide-react";

// Category display labels
const CATEGORY_LABELS = {
  soc: "Performance",
  ram: "RAM",
  storage: "Storage",
  display: "Display",
  camera: "Camera",
  battery: "Battery",
  charging: "Charging",
  durability: "Durability",
  protection: "Protection",
  extras: "Extras",
};

// Category order for display
const CATEGORY_ORDER = [
  "soc", "ram", "storage", "display", "camera",
  "battery", "charging", "durability", "protection", "extras"
];

// Score bar component
function ScoreBar({ score, maxScore = 10, isWinner = false }) {
  const percentage = Math.min((score / maxScore) * 100, 100);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isWinner
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
              : "bg-gradient-to-r from-zinc-500 to-zinc-400"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-8 text-right ${isWinner ? "text-emerald-400" : "text-zinc-400"}`}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function CompareView({ phones, onRemove, onClose }) {
  const [activeTab, setActiveTab] = useState("specs");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // No need to fetch - phones already have breakdown data from static JSON

  // Handle escape key for fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFullscreen]);

  if (phones.length === 0) return null;

  const panelClasses = isFullscreen
    ? "fixed inset-0 z-50"
    : "fixed bottom-0 left-0 right-0 z-50";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: isFullscreen ? 0 : 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: isFullscreen ? 0 : 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`${panelClasses} bg-zinc-950/98 backdrop-blur-2xl border-t border-white/10 shadow-2xl shadow-black/50`}
      >
        {/* Gradient accent at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <div className={`${isFullscreen ? "h-full overflow-auto" : ""} max-w-7xl mx-auto px-4 sm:px-6 py-5`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20">
                <Scale className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Compare Phones</h3>
                <p className="text-xs text-zinc-400">
                  {phones.length === 1 ? "Add more phones to compare" : `Comparing ${phones.length} phones`}
                </p>
              </div>
              <span className="ml-2 px-3 py-1 rounded-full bg-white/10 text-zinc-300 text-sm font-medium border border-white/10">
                {phones.length}/3
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                aria-label="Close comparison"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Phone slots */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[0, 1, 2].map((idx) => {
              const phone = phones[idx];
              if (phone) {
                return (
                  <PhoneSlot
                    key={phone.slug}
                    phone={phone}
                    onRemove={() => onRemove(phone.slug)}
                    isWinner={phones.length >= 2 && phones.reduce((a, b) => a.raw_score > b.raw_score ? a : b).slug === phone.slug}
                  />
                );
              }
              return <EmptySlot key={idx} />;
            })}
          </div>

          {/* Comparison content */}
          {phones.length >= 2 && (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-5">
                <TabButton
                  active={activeTab === "specs"}
                  onClick={() => setActiveTab("specs")}
                  icon={<TrendingUp className="w-4 h-4" />}
                >
                  Spec Breakdown
                </TabButton>
                <TabButton
                  active={activeTab === "summary"}
                  onClick={() => setActiveTab("summary")}
                  icon={<Award className="w-4 h-4" />}
                >
                  Summary
                </TabButton>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === "specs" ? (
                  <motion.div
                    key="specs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SpecsTable phones={phones} isFullscreen={isFullscreen} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SummaryView phones={phones} />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Instruction when only 1 phone */}
          {phones.length === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-zinc-500" />
              </div>
              <p className="text-zinc-400 mb-1">Add at least one more phone to compare</p>
              <p className="text-xs text-zinc-500">Click the + button on any phone card</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Phone slot component
function PhoneSlot({ phone, onRemove, isWinner }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative p-4 rounded-xl bg-white/[0.04] border group transition-all duration-200 ${
        isWinner
          ? "border-emerald-400/30 bg-emerald-500/5"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* Winner badge */}
      {isWinner && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <Trophy className="w-3 h-3 text-white" />
            <span className="text-[10px] font-bold text-white">Best</span>
          </div>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -left-2 p-2 rounded-full bg-red-500/90 hover:bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 hover:scale-110"
        aria-label={`Remove ${phone.model}`}
      >
        <X className="w-3 h-3" />
      </button>

      {/* Phone info */}
      <p className="text-sm font-semibold text-white truncate mb-2">
        {phone.model}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400 font-medium">
          S${Number(phone.price_sgd).toFixed(0)}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isWinner ? "bg-emerald-400" : "bg-zinc-500"}`} />
          <span className={`text-sm font-bold ${isWinner ? "text-emerald-400" : "text-zinc-300"}`}>
            {Number(phone.raw_score).toFixed(1)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Empty slot component
function EmptySlot() {
  return (
    <div className="p-4 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center min-h-[84px] bg-white/[0.02]">
      <div className="flex items-center gap-2 text-zinc-500">
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Add phone</span>
      </div>
    </div>
  );
}

// Tab button component
function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
          : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/10"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// Specs comparison table
function SpecsTable({ phones, isFullscreen }) {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 ${isFullscreen ? "max-h-[calc(100vh-300px)]" : ""}`}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm">
            <th className="text-left py-3 px-4 text-zinc-400 font-semibold w-32">
              Category
            </th>
            {phones.map((p) => (
              <th
                key={p.slug}
                className="text-left py-3 px-4 text-white font-semibold"
              >
                <span className="truncate block max-w-[150px]">
                  {p.model.split(" ").slice(0, 3).join(" ")}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORY_ORDER.map((key) => {
            const scores = phones.map(
              (p) => p.breakdown?.[key] || 0
            );
            const maxScore = Math.max(...scores);
            const hasWinner = scores.filter((s) => s === maxScore).length === 1 && maxScore > 0;

            return (
              <tr key={key} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 text-zinc-300 font-medium">
                  {CATEGORY_LABELS[key]}
                </td>
                {scores.map((score, i) => {
                  const isWinner = hasWinner && score === maxScore;
                  return (
                    <td key={i} className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {isWinner && (
                          <Trophy className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        <ScoreBar score={score} isWinner={isWinner} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Overall row */}
          <tr className="bg-white/5 border-t-2 border-white/10">
            <td className="py-4 px-4 text-white font-bold">Overall Score</td>
            {phones.map((p) => {
              const scores = phones.map((ph) => ph.raw_score);
              const maxScore = Math.max(...scores);
              const isWinner = p.raw_score === maxScore && phones.length > 1;
              return (
                <td key={p.slug} className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    {isWinner && <Trophy className="w-5 h-5 text-emerald-400" />}
                    <span className={`text-xl font-bold ${isWinner ? "text-emerald-400" : "text-white"}`}>
                      {Number(p.raw_score).toFixed(1)}
                    </span>
                    <span className="text-xs text-zinc-500">/10</span>
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Summary view component
function SummaryView({ phones }) {
  if (phones.length < 2) return null;

  // Find best for specs and value
  const bestSpecs = phones.reduce((a, b) =>
    a.raw_score > b.raw_score ? a : b
  );
  const bestValue = phones.reduce((a, b) =>
    (a.value_score ?? a.smartbuy_score ?? 0) > (b.value_score ?? b.smartbuy_score ?? 0) ? a : b
  );

  // Count category wins
  const categoryWins = phones.map(p => {
    let wins = 0;
    CATEGORY_ORDER.forEach(key => {
      const scores = phones.map(ph => ph.breakdown?.[key] || 0);
      const maxScore = Math.max(...scores);
      if (p.breakdown?.[key] === maxScore && scores.filter(s => s === maxScore).length === 1) {
        wins++;
      }
    });
    return { phone: p, wins };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Best for specs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Best Specs</span>
            <p className="text-xs text-zinc-400">Highest overall score</p>
          </div>
        </div>
        <p className="text-lg font-bold text-white mb-2 truncate">{bestSpecs.model}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-emerald-400">{Number(bestSpecs.raw_score).toFixed(1)}</span>
          <span className="text-sm text-zinc-400">/10</span>
        </div>
      </motion.div>

      {/* Best value */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Best Value</span>
            <p className="text-xs text-zinc-400">Best bang for buck</p>
          </div>
        </div>
        <p className="text-lg font-bold text-white mb-2 truncate">{bestValue.model}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-blue-400">{Number(bestValue.value_score ?? bestValue.smartbuy_score ?? 0).toFixed(1)}</span>
          <span className="text-sm text-zinc-400">/10</span>
        </div>
      </motion.div>

      {/* Category wins */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/20"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Category Wins</span>
            <p className="text-xs text-zinc-400">Best in category count</p>
          </div>
        </div>
        <div className="space-y-2">
          {categoryWins
            .sort((a, b) => b.wins - a.wins)
            .map(({ phone, wins }) => (
              <div key={phone.slug} className="flex items-center justify-between">
                <span className="text-sm text-white truncate max-w-[140px]">{phone.model.split(" ").slice(0, 2).join(" ")}</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: wins }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-purple-400" />
                    ))}
                    {Array.from({ length: 10 - wins }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-white/10" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-purple-400 w-4">{wins}</span>
                </div>
              </div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}

export default CompareView;
