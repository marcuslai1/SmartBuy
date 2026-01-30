/**
 * BrandSelector - Premium brand selection screen
 *
 * Allows users to filter by brand or select all brands.
 * Features brand-specific colors and visual feedback.
 */
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Grid3X3 } from "lucide-react";

// Brand configuration with colors
const BRANDS = [
  { id: "All", label: "All Brands", color: "zinc", description: "Show all available phones" },
  { id: "Apple", label: "Apple", color: "slate", description: "iPhone lineup" },
  { id: "Samsung", label: "Samsung", color: "blue", description: "Galaxy series" },
  { id: "Google", label: "Google", color: "red", description: "Pixel phones" },
  { id: "Xiaomi", label: "Xiaomi", color: "orange", description: "Mi & Redmi series" },
  { id: "Realme", label: "Realme", color: "yellow", description: "Youth-focused phones" },
  { id: "Oppo", label: "Oppo", color: "green", description: "Find & Reno series" },
  { id: "Vivo", label: "Vivo", color: "sky", description: "V & X series" },
  { id: "Honor", label: "Honor", color: "cyan", description: "Magic series" },
  { id: "Nothing", label: "Nothing", color: "white", description: "Phone series" },
  { id: "OnePlus", label: "OnePlus", color: "rose", description: "Never Settle" },
];

// Color mapping for each brand
const colorClasses = {
  zinc: {
    bg: "bg-zinc-500/10",
    bgHover: "hover:bg-zinc-500/20",
    border: "border-zinc-500/20",
    borderSelected: "border-zinc-400",
    text: "text-zinc-300",
    glow: "shadow-zinc-500/20",
  },
  slate: {
    bg: "bg-slate-500/10",
    bgHover: "hover:bg-slate-500/20",
    border: "border-slate-500/20",
    borderSelected: "border-slate-400",
    text: "text-slate-300",
    glow: "shadow-slate-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    bgHover: "hover:bg-blue-500/20",
    border: "border-blue-500/20",
    borderSelected: "border-blue-400",
    text: "text-blue-300",
    glow: "shadow-blue-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    bgHover: "hover:bg-red-500/20",
    border: "border-red-500/20",
    borderSelected: "border-red-400",
    text: "text-red-300",
    glow: "shadow-red-500/20",
  },
  orange: {
    bg: "bg-orange-500/10",
    bgHover: "hover:bg-orange-500/20",
    border: "border-orange-500/20",
    borderSelected: "border-orange-400",
    text: "text-orange-300",
    glow: "shadow-orange-500/20",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    bgHover: "hover:bg-yellow-500/20",
    border: "border-yellow-500/20",
    borderSelected: "border-yellow-400",
    text: "text-yellow-300",
    glow: "shadow-yellow-500/20",
  },
  green: {
    bg: "bg-green-500/10",
    bgHover: "hover:bg-green-500/20",
    border: "border-green-500/20",
    borderSelected: "border-green-400",
    text: "text-green-300",
    glow: "shadow-green-500/20",
  },
  sky: {
    bg: "bg-sky-500/10",
    bgHover: "hover:bg-sky-500/20",
    border: "border-sky-500/20",
    borderSelected: "border-sky-400",
    text: "text-sky-300",
    glow: "shadow-sky-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    bgHover: "hover:bg-cyan-500/20",
    border: "border-cyan-500/20",
    borderSelected: "border-cyan-400",
    text: "text-cyan-300",
    glow: "shadow-cyan-500/20",
  },
  white: {
    bg: "bg-white/10",
    bgHover: "hover:bg-white/20",
    border: "border-white/20",
    borderSelected: "border-white",
    text: "text-white",
    glow: "shadow-white/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    bgHover: "hover:bg-rose-500/20",
    border: "border-rose-500/20",
    borderSelected: "border-rose-400",
    text: "text-rose-300",
    glow: "shadow-rose-500/20",
  },
};

function BrandSelector({ brand, setBrand }) {
  const current = brand || "All";

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.03, delayChildren: 0.1 } },
  };

  const item = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  };

  const handleSelect = (b) => setBrand(b === "All" ? "" : b);

  return (
    <section
      aria-labelledby="brand-heading"
      className="min-h-screen w-screen mx-[calc(50%-50vw)] flex items-center justify-center px-4 sm:px-6 py-12
                 bg-gradient-to-b from-gray-900 via-black to-gray-900 overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-4xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Heading */}
        <motion.div variants={item} className="text-center mb-10">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
            whileHover={{ scale: 1.02 }}
          >
            <Grid3X3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-zinc-300">Step 2 of 2</span>
          </motion.div>

          <h2
            id="brand-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4"
          >
            Pick a{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Brand
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto">
            Focus on a specific brand or explore all available phones
          </p>
        </motion.div>

        {/* "All Brands" featured card */}
        <motion.div variants={item} className="mb-6">
          {(() => {
            const allBrand = BRANDS[0];
            const selected = current === "All";
            const colors = colorClasses[allBrand.color];

            return (
              <motion.button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect("All")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={[
                  "w-full relative rounded-2xl p-5 text-left transition-all duration-300",
                  "border bg-white/[0.02] backdrop-blur-sm",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-black",
                  selected
                    ? `${colors.borderSelected} ring-2 ring-blue-400 shadow-lg ${colors.glow}`
                    : `${colors.border} ${colors.bgHover}`,
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={[
                        "flex items-center justify-center w-12 h-12 rounded-xl",
                        selected ? "bg-blue-500 text-white" : "bg-white/10 text-zinc-300",
                      ].join(" ")}
                    >
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{allBrand.label}</h3>
                      <p className="text-sm text-zinc-400">{allBrand.description}</p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 transition-transform ${selected ? "text-blue-400 translate-x-1" : "text-zinc-500"}`}
                  />
                </div>
              </motion.button>
            );
          })()}
        </motion.div>

        {/* Divider */}
        <motion.div variants={item} className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Or choose a brand</span>
          <div className="flex-1 h-px bg-white/10" />
        </motion.div>

        {/* Brand grid */}
        <motion.div
          role="radiogroup"
          aria-label="Brand filter"
          variants={container}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
        >
          {BRANDS.slice(1).map(({ id, label, color }) => {
            const selected = current === id;
            const colors = colorClasses[color];

            return (
              <motion.button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect(id)}
                variants={item}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.97 }}
                className={[
                  "relative rounded-xl px-4 py-3 text-center transition-all duration-200",
                  "border backdrop-blur-sm",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-black",
                  selected
                    ? `${colors.bg} ${colors.borderSelected} ${colors.text} shadow-lg ${colors.glow}`
                    : `bg-white/[0.02] ${colors.border} text-zinc-300 ${colors.bgHover}`,
                ].join(" ")}
              >
                {/* Selection indicator dot */}
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current"
                  />
                )}
                <span className="font-medium">{label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Help text */}
        <motion.p variants={item} className="text-center text-zinc-500 text-sm mt-8">
          You can also filter by brand in the search results
        </motion.p>
      </motion.div>
    </section>
  );
}

export default BrandSelector;
