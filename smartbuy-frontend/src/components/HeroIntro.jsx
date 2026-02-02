/**
 * HeroIntro - Premium splash screen with immersive animations
 *
 * Creates an engaging first impression with animated gradient mesh,
 * floating particles, and smooth transitions into the main app.
 */
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Smartphone, Sparkles, ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";

const DURATION = 4; // Total time before auto-continue

// Generate floating particles
function useParticles(count = 20) {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }));
  }, [count]);
}

function HeroIntro({ onFinish }) {
  const [canSkip, setCanSkip] = useState(false);
  const [progress, setProgress] = useState(0);
  const particles = useParticles(25);

  // Allow skip after a short delay, auto-continue after DURATION
  useEffect(() => {
    const skipTimer = setTimeout(() => setCanSkip(true), 800);
    const autoTimer = setTimeout(() => onFinish?.(), DURATION * 1000);

    // Smooth progress animation
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / (DURATION * 1000)) * 100, 100);
      setProgress(newProgress);
    }, 16);

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoTimer);
      clearInterval(progressInterval);
    };
  }, [onFinish]);

  // Animation variants
  const fadeUp = (delay = 0) => ({
    initial: { y: 40, opacity: 0, filter: "blur(10px)" },
    animate: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { duration: 0.8, delay, ease: [0.25, 0.4, 0.25, 1] }
    },
  });

  const scaleIn = (delay = 0) => ({
    initial: { scale: 0.5, opacity: 0, rotate: -10 },
    animate: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: { duration: 0.7, delay, ease: [0.34, 1.56, 0.64, 1] }
    },
  });

  const stagger = {
    animate: { transition: { staggerChildren: 0.1 } },
  };

  const features = [
    { icon: Zap, label: "Smart Recommendations" },
    { icon: TrendingUp, label: "Price Comparison" },
    { icon: Shield, label: "Detailed Specs" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Animated gradient mesh background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-black to-gray-950" />

        {/* Primary gradient orbs */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
            top: "10%",
            left: "20%"
          }}
          animate={{
            x: [0, 80, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)",
            bottom: "10%",
            right: "15%"
          }}
          animate={{
            x: [0, -60, 0],
            y: [0, -40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full blur-[80px]"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)",
            top: "40%",
            right: "30%"
          }}
          animate={{
            x: [0, 40, 0],
            y: [0, -50, 0],
            scale: [1.1, 1, 1.1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Accent orb */}
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full blur-[60px]"
          style={{
            background: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)",
            bottom: "30%",
            left: "10%"
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/20"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-20 max-w-4xl mx-auto px-6 text-center"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {/* Icon badge */}
        <motion.div {...scaleIn(0.1)} className="flex justify-center mb-10">
          <div className="relative group">
            {/* Outer glow ring */}
            <motion.div
              className="absolute -inset-4 rounded-3xl opacity-60"
              style={{
                background: "conic-gradient(from 0deg, #3b82f6, #8b5cf6, #06b6d4, #3b82f6)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute -inset-4 rounded-3xl bg-black/80 backdrop-blur-xl" />

            {/* Icon container */}
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-2xl shadow-blue-500/40">
              <Smartphone className="w-12 h-12 text-white" strokeWidth={1.5} />

              {/* Inner highlight */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/10 to-white/20" />
            </div>

            {/* Sparkle accents */}
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ rotate: [0, 20, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -left-1"
              animate={{ rotate: [0, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <Sparkles className="w-4 h-4 text-cyan-400 drop-shadow-lg" />
            </motion.div>
          </div>
        </motion.div>

        {/* Main title */}
        <motion.h1
          {...fadeUp(0.2)}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
        >
          <span className="text-white/90">Welcome to</span>
          <br />
          <span className="relative">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SmartBuy
            </span>
            {/* Animated underline */}
            <motion.span
              className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            />
          </span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          {...fadeUp(0.35)}
          className="text-xl sm:text-2xl text-zinc-300/90 mb-6 leading-relaxed max-w-2xl mx-auto"
        >
          Find your perfect phone with
          <span className="text-white font-semibold"> intelligent scoring</span>
        </motion.p>

        {/* Features list */}
        <motion.div
          {...fadeUp(0.5)}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {features.map((feature, i) => (
            <motion.span
              key={feature.label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-sm text-sm text-zinc-300"
              whileHover={{
                scale: 1.05,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "rgba(255,255,255,0.2)"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <feature.icon className="w-4 h-4 text-blue-400" />
              {feature.label}
            </motion.span>
          ))}
        </motion.div>

        {/* Progress bar */}
        <motion.div {...fadeUp(0.6)} className="mb-10">
          <div className="relative h-1.5 w-56 mx-auto bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6)",
              }}
            />
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: canSkip ? 1 : 0, y: canSkip ? 0 : 20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <button
            onClick={() => canSkip && onFinish?.()}
            disabled={!canSkip}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl
                       bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg
                       shadow-xl shadow-blue-500/30 overflow-hidden
                       hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02]
                       active:scale-[0.98] transition-all duration-200
                       disabled:opacity-0 disabled:pointer-events-none
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {/* Button shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
              animate={{ x: ["-200%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
            />

            <span className="relative z-10">Get Started</span>
            <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Skip hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: canSkip ? 0.5 : 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="mt-4 text-xs text-zinc-500"
        >
          Press Enter or click to continue
        </motion.p>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

      {/* Top vignette */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
    </section>
  );
}

export default HeroIntro;
