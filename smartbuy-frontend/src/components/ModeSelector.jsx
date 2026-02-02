/**
 * ModeSelector - Premium mode selection with immersive card design
 *
 * Allows users to choose their recommendation priority:
 * Budget (value focus), Mid-Range (balanced), or Flagship (specs focus)
 */
import { motion } from "framer-motion";
import { Wallet, Scale, Crown, Check, Sparkles } from "lucide-react";

const MODES = [
  {
    id: "budget",
    title: "Budget",
    subtitle: "Best bang for buck",
    description: "Prioritizes value-for-money. Perfect for finding hidden gems that punch above their price.",
    Icon: Wallet,
    gradient: "from-emerald-500 to-teal-600",
    accentColor: "emerald",
    iconBg: "bg-emerald-500",
    glowColor: "rgba(16, 185, 129, 0.4)",
    features: ["Value-focused scoring", "Price-to-performance", "Best deals highlighted"],
  },
  {
    id: "midrange",
    title: "Balanced",
    subtitle: "Perfect middle ground",
    description: "Equal weight to specs and value. Ideal for users who want performance without overpaying.",
    Icon: Scale,
    gradient: "from-blue-500 to-indigo-600",
    accentColor: "blue",
    iconBg: "bg-blue-500",
    glowColor: "rgba(59, 130, 246, 0.4)",
    features: ["Balanced scoring", "Specs meet value", "Versatile picks"],
    recommended: true,
  },
  {
    id: "flagship",
    title: "Flagship",
    subtitle: "Premium experience",
    description: "Focuses on raw performance and cutting-edge features. For those who want the absolute best.",
    Icon: Crown,
    gradient: "from-amber-500 to-orange-600",
    accentColor: "amber",
    iconBg: "bg-amber-500",
    glowColor: "rgba(245, 158, 11, 0.4)",
    features: ["Performance-focused", "Top-tier features", "Latest technology"],
  },
];

const accentStyles = {
  emerald: {
    ring: "ring-emerald-400/50",
    border: "border-emerald-400/30",
    shadow: "shadow-emerald-500/20",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    checkBg: "bg-emerald-500",
  },
  blue: {
    ring: "ring-blue-400/50",
    border: "border-blue-400/30",
    shadow: "shadow-blue-500/20",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    checkBg: "bg-blue-500",
  },
  amber: {
    ring: "ring-amber-400/50",
    border: "border-amber-400/30",
    shadow: "shadow-amber-500/20",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    checkBg: "bg-amber-500",
  },
};

function ModeSelector({ mode, setMode }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 }
    },
  };

  const item = {
    hidden: { y: 30, opacity: 0, scale: 0.95 },
    show: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }
    },
  };

  return (
    <section
      aria-labelledby="mode-heading"
      className="min-h-screen w-screen mx-[calc(50%-50vw)] flex items-center justify-center px-4 sm:px-6 py-16
                 bg-gradient-to-b from-gray-950 via-black to-gray-950 overflow-hidden"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-cyan-500/8 rounded-full blur-[80px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-5xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center mb-14">
          <motion.div
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-sm mb-8"
            whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.2)" }}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">1</span>
            </div>
            <span className="text-sm font-medium text-zinc-300">Choose your priority</span>
          </motion.div>

          <h2
            id="mode-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-5 tracking-tight"
          >
            What matters most
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              to you?
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Select how we should prioritize phones for your recommendations
          </p>
        </motion.div>

        {/* Mode Cards */}
        <motion.div
          role="radiogroup"
          aria-label="Recommendation Mode"
          className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6"
        >
          {MODES.map(({ id, title, subtitle, description, Icon, gradient, accentColor, iconBg, glowColor, features, recommended }) => {
            const selected = mode === id;
            const accent = accentStyles[accentColor];

            return (
              <motion.button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(id)}
                variants={item}
                whileHover={{
                  y: -8,
                  transition: { duration: 0.3, ease: "easeOut" }
                }}
                whileTap={{ scale: 0.98 }}
                className={[
                  "group relative rounded-2xl p-6 text-left transition-all duration-300",
                  "border bg-white/[0.03] backdrop-blur-sm",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-black",
                  selected
                    ? `${accent.border} ring-2 ${accent.ring} shadow-2xl ${accent.shadow}`
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.05]",
                ].join(" ")}
              >
                {/* Glow effect on selected */}
                {selected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 rounded-2xl blur-2xl -z-10"
                    style={{ background: glowColor }}
                  />
                )}

                {/* Recommended badge */}
                {recommended && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30">
                      <Sparkles className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wide">Recommended</span>
                    </div>
                  </motion.div>
                )}

                <div className="relative z-10">
                  {/* Icon and check */}
                  <div className="flex items-start justify-between mb-5">
                    <motion.div
                      className={[
                        "relative flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300",
                        selected
                          ? `bg-gradient-to-br ${gradient} shadow-lg`
                          : "bg-white/[0.06]",
                      ].join(" ")}
                      animate={selected ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon
                        className={[
                          "w-8 h-8 transition-colors duration-300",
                          selected ? "text-white" : accent.text,
                        ].join(" ")}
                        strokeWidth={1.5}
                      />
                      {/* Icon glow */}
                      {selected && (
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} blur-xl opacity-50`} />
                      )}
                    </motion.div>

                    {/* Selection indicator */}
                    <motion.div
                      initial={false}
                      animate={{
                        scale: selected ? 1 : 0.8,
                        opacity: selected ? 1 : 0,
                      }}
                      className={`flex items-center justify-center w-7 h-7 rounded-full ${accent.checkBg} shadow-lg`}
                    >
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </motion.div>
                  </div>

                  {/* Title and subtitle */}
                  <h3 className="text-2xl font-bold text-white mb-1.5">{title}</h3>
                  <p className={`text-sm mb-4 transition-colors ${selected ? "text-white/80" : "text-zinc-400"}`}>
                    {subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                    {description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2.5">
                    {features.map((feature, i) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-center gap-2.5"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${selected ? accent.checkBg : "bg-zinc-600"} transition-colors`} />
                        <span className={`text-sm transition-colors ${selected ? "text-zinc-200" : "text-zinc-500"}`}>
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Bottom accent line */}
                <motion.div
                  className={`absolute bottom-0 left-6 right-6 h-0.5 rounded-full bg-gradient-to-r ${gradient}`}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: selected ? 1 : 0, opacity: selected ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            );
          })}
        </motion.div>

        {/* Help text */}
        <motion.p variants={item} className="text-center text-zinc-500 text-sm mt-10">
          You can change this anytime in the filter bar
        </motion.p>
      </motion.div>
    </section>
  );
}

export default ModeSelector;
