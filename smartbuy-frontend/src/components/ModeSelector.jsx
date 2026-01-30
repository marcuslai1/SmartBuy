/**
 * ModeSelector - Premium mode selection screen
 *
 * Allows users to choose their recommendation priority:
 * Budget (value focus), Mid-Range (balanced), or Flagship (specs focus)
 */
import { motion } from "framer-motion";
import { Wallet, Scale, Crown, TrendingUp, Zap, Star } from "lucide-react";

const MODES = [
  {
    id: "budget",
    title: "Budget",
    subtitle: "Best bang for buck",
    description: "Prioritizes value-for-money. Perfect for finding hidden gems that punch above their price.",
    Icon: Wallet,
    color: "emerald",
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "bg-emerald-500/20",
    features: ["Value-focused scoring", "Price-to-performance ratio", "Best deals highlighted"],
  },
  {
    id: "midrange",
    title: "Mid-Range",
    subtitle: "Balanced choice",
    description: "Equal weight to specs and value. Ideal for users who want good performance without overpaying.",
    Icon: Scale,
    color: "blue",
    gradient: "from-blue-500 to-indigo-500",
    bgGlow: "bg-blue-500/20",
    features: ["Balanced scoring", "Specs meet value", "Versatile picks"],
  },
  {
    id: "flagship",
    title: "Flagship",
    subtitle: "Premium experience",
    description: "Focuses on raw performance and features. For those who want the best tech regardless of price.",
    Icon: Crown,
    color: "amber",
    gradient: "from-amber-500 to-orange-500",
    bgGlow: "bg-amber-500/20",
    features: ["Performance-focused", "Top-tier features", "Latest technology"],
  },
];

const colorClasses = {
  emerald: {
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-400",
    iconBgSelected: "bg-gradient-to-br from-emerald-500 to-teal-500",
    ring: "ring-emerald-400",
    shadow: "shadow-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  },
  blue: {
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-400",
    iconBgSelected: "bg-gradient-to-br from-blue-500 to-indigo-500",
    ring: "ring-blue-400",
    shadow: "shadow-blue-500/20",
    badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-400",
    iconBgSelected: "bg-gradient-to-br from-amber-500 to-orange-500",
    ring: "ring-amber-400",
    shadow: "shadow-amber-500/20",
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  },
};

function ModeSelector({ mode, setMode }) {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <section
      aria-labelledby="mode-heading"
      className="min-h-screen w-screen mx-[calc(50%-50vw)] flex items-center justify-center px-4 sm:px-6 py-12
                 bg-gradient-to-b from-gray-900 via-black to-gray-900 overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/6 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/6 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-5xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Heading */}
        <motion.div variants={item} className="text-center mb-12">
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
            whileHover={{ scale: 1.02 }}
          >
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-zinc-300">Step 1 of 2</span>
          </motion.div>

          <h2
            id="mode-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4"
          >
            What matters most
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              to you?
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            Choose how we should rank phones for your recommendations
          </p>
        </motion.div>

        {/* Mode Cards */}
        <motion.div
          role="radiogroup"
          aria-label="Recommendation Mode"
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6"
          variants={container}
        >
          {MODES.map(({ id, title, subtitle, description, Icon, color, gradient, bgGlow, features }) => {
            const selected = mode === id;
            const colors = colorClasses[color];

            return (
              <motion.button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(id)}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className={[
                  "group relative rounded-2xl p-6 text-left transition-all duration-300",
                  "border bg-white/[0.02] backdrop-blur-sm",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  selected
                    ? `border-white/20 ${colors.ring} ring-2 ${colors.shadow} shadow-xl`
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                {/* Glow effect on selected */}
                {selected && (
                  <div className={`absolute inset-0 ${bgGlow} rounded-2xl blur-xl opacity-50`} />
                )}

                <div className="relative z-10">
                  {/* Icon and title row */}
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={[
                        "flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300",
                        selected ? `${colors.iconBgSelected} text-white shadow-lg` : `${colors.iconBg} ${colors.iconText}`,
                      ].join(" ")}
                    >
                      <Icon className="w-7 h-7" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                      <p className={`text-sm ${selected ? "text-white/80" : "text-zinc-400"}`}>
                        {subtitle}
                      </p>
                    </div>
                    {/* Selected indicator */}
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-white"
                      >
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient}`} />
                      </motion.div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
                    {description}
                  </p>

                  {/* Features */}
                  <div className="space-y-2">
                    {features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-xs text-zinc-500">
                        <Star className={`w-3 h-3 ${selected ? colors.iconText : "text-zinc-600"}`} />
                        <span className={selected ? "text-zinc-300" : ""}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recommended badge for midrange */}
                  {id === "midrange" && (
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Popular
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Help text */}
        <motion.p variants={item} className="text-center text-zinc-500 text-sm mt-8">
          Don't worry, you can change this anytime in the filter bar
        </motion.p>
      </motion.div>
    </section>
  );
}

export default ModeSelector;
