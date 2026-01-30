/**
 * HeroIntro - Premium splash screen
 *
 * Creates an engaging first impression with animated elements
 * and smooth transitions into the main app.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, Sparkles, ArrowRight } from "lucide-react";

const DURATION = 4; // Total time before auto-continue

function HeroIntro({ onFinish }) {
  const [canSkip, setCanSkip] = useState(false);

  // Allow skip after a short delay, auto-continue after DURATION
  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), 1000);
    const autoTimer = setTimeout(() => onFinish?.(), DURATION * 1000);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoTimer);
    };
  }, [onFinish]);

  // Animation variants
  const fadeUp = (delay = 0) => ({
    initial: { y: 30, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.7, delay, ease: "easeOut" } },
  });

  const scaleIn = (delay = 0) => ({
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.6, delay, ease: "easeOut" } },
  });

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Animated background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900" />

        {/* Animated gradient orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, -20, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -40, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        {/* Icon badge */}
        <motion.div {...scaleIn(0.1)} className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl" />
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <Smartphone className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            {/* Sparkle accent */}
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* Main title */}
        <motion.h1
          {...fadeUp(0.2)}
          className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6"
        >
          <span className="text-white">Welcome to</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            SmartBuy
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          {...fadeUp(0.35)}
          className="text-xl sm:text-2xl text-zinc-300 mb-4 leading-relaxed"
        >
          Find your perfect phone with
          <span className="text-white font-medium"> intelligent scoring</span>
        </motion.p>

        {/* Features list */}
        <motion.div
          {...fadeUp(0.5)}
          className="flex flex-wrap justify-center gap-4 mb-10 text-sm text-zinc-400"
        >
          {["Smart Recommendations", "Price Comparison", "Detailed Specs"].map((feature, i) => (
            <span
              key={feature}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {feature}
            </span>
          ))}
        </motion.div>

        {/* Progress indicator */}
        <motion.div {...fadeUp(0.6)} className="mb-8">
          <div className="h-1 w-48 mx-auto bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: DURATION, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        {/* Skip button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: canSkip ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => canSkip && onFinish?.()}
            disabled={!canSkip}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-white/5 border border-white/10 text-white font-medium
                       hover:bg-white/10 hover:border-white/20 transition-all duration-200
                       disabled:opacity-0 disabled:pointer-events-none"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}

export default HeroIntro;
