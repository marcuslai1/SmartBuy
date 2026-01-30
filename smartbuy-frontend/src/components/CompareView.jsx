/**
 * CompareView - Phone comparison panel
 *
 * Displays a slide-up panel for comparing 2-3 phones side by side.
 * Shows score breakdowns and category winners.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trophy, TrendingUp, Scale } from "lucide-react";

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

function CompareView({ phones, onRemove, onClose }) {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("specs"); // 'specs' or 'summary'

  // Fetch comparison data when phones change
  useEffect(() => {
    if (phones.length < 2) {
      setComparisonData(null);
      return;
    }

    const fetchComparison = async () => {
      setLoading(true);
      try {
        const slugParams = phones.map((p) => `slug=${p.slug}`).join("&");
        const res = await fetch(`/api/compare/?${slugParams}`);
        if (res.ok) {
          const data = await res.json();
          setComparisonData(data);
        }
      } catch (err) {
        console.error("Comparison fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [phones]);

  if (phones.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/50"
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">
              Compare Phones
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 text-sm">
              {phones.length}/3
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phone slots */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2].map((idx) => {
            const phone = phones[idx];
            if (phone) {
              return (
                <PhoneSlot
                  key={phone.slug}
                  phone={phone}
                  onRemove={() => onRemove(phone.slug)}
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
            <div className="flex gap-2 mb-4">
              <TabButton
                active={activeTab === "specs"}
                onClick={() => setActiveTab("specs")}
              >
                Spec Breakdown
              </TabButton>
              <TabButton
                active={activeTab === "summary"}
                onClick={() => setActiveTab("summary")}
              >
                Summary
              </TabButton>
            </div>

            {/* Tab content */}
            {loading ? (
              <div className="text-center py-8 text-zinc-400">
                Loading comparison...
              </div>
            ) : activeTab === "specs" ? (
              <SpecsTable phones={phones} />
            ) : (
              <SummaryView phones={phones} comparisonData={comparisonData} />
            )}
          </>
        )}

        {/* Instruction when only 1 phone */}
        {phones.length === 1 && (
          <p className="text-center text-zinc-400 py-4">
            Add at least one more phone to compare
          </p>
        )}
      </div>
    </motion.div>
  );
}

// Phone slot component
function PhoneSlot({ phone, onRemove }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative p-3 rounded-xl bg-white/5 border border-white/10 group"
    >
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500/90 hover:bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label={`Remove ${phone.model}`}
      >
        <X className="w-3 h-3" />
      </button>

      {/* Phone info */}
      <p className="text-sm font-medium text-white truncate mb-1">
        {phone.model}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          S${Number(phone.price_sgd).toFixed(0)}
        </span>
        <span className="text-xs text-emerald-400 font-medium">
          {Number(phone.raw_score).toFixed(1)}/10
        </span>
      </div>
    </motion.div>
  );
}

// Empty slot component
function EmptySlot() {
  return (
    <div className="p-3 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center min-h-[72px]">
      <div className="flex items-center gap-2 text-zinc-500">
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add phone</span>
      </div>
    </div>
  );
}

// Tab button component
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// Specs comparison table
function SpecsTable({ phones }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 px-3 text-zinc-400 font-medium w-32">
              Category
            </th>
            {phones.map((p) => (
              <th
                key={p.slug}
                className="text-center py-2 px-3 text-white font-medium"
              >
                {p.model.split(" ").slice(0, 2).join(" ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORY_ORDER.map((key) => {
            const scores = phones.map(
              (p) => p.score_breakdown?.[key] || 0
            );
            const maxScore = Math.max(...scores);
            const hasWinner = scores.filter((s) => s === maxScore).length === 1;

            return (
              <tr key={key} className="border-b border-white/5">
                <td className="py-2.5 px-3 text-zinc-300">
                  {CATEGORY_LABELS[key]}
                </td>
                {scores.map((score, i) => {
                  const isWinner = hasWinner && score === maxScore && score > 0;
                  return (
                    <td key={i} className="text-center py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isWinner ? "text-emerald-400" : "text-zinc-400"
                        }`}
                      >
                        {isWinner && <Trophy className="w-3 h-3" />}
                        {score.toFixed(1)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Overall row */}
          <tr className="bg-white/5">
            <td className="py-2.5 px-3 text-white font-semibold">Overall</td>
            {phones.map((p) => {
              const scores = phones.map((ph) => ph.raw_score);
              const maxScore = Math.max(...scores);
              const isWinner = p.raw_score === maxScore;
              return (
                <td
                  key={p.slug}
                  className={`text-center py-2.5 px-3 font-bold ${
                    isWinner ? "text-emerald-400" : "text-white"
                  }`}
                >
                  {Number(p.raw_score).toFixed(1)}
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
function SummaryView({ phones, comparisonData }) {
  if (!comparisonData || phones.length < 2) return null;

  // Find best for specs and value
  const bestSpecs = phones.reduce((a, b) =>
    a.raw_score > b.raw_score ? a : b
  );
  const bestValue = phones.reduce((a, b) =>
    a.smartbuy_score > b.smartbuy_score ? a : b
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Best for specs */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            Best Specs
          </span>
        </div>
        <p className="text-white font-semibold">{bestSpecs.model}</p>
        <p className="text-sm text-zinc-400 mt-1">
          Score: {Number(bestSpecs.raw_score).toFixed(1)}/10
        </p>
      </div>

      {/* Best value */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Best Value</span>
        </div>
        <p className="text-white font-semibold">{bestValue.model}</p>
        <p className="text-sm text-zinc-400 mt-1">
          {Number(bestValue.smartbuy_score).toFixed(2)} pts/$100
        </p>
      </div>
    </div>
  );
}

export default CompareView;
