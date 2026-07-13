import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import fallbackImg from "../../assets/DevPilotSinFondo.png";

interface Props {
  onGetStarted: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.25 },
  },
  exit: {
    opacity: 0,
    scale: 1.05,
    transition: { duration: 0.5, ease: "easeIn" as const },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

export default function WelcomeHero({ onGetStarted }: Props) {
  const [mounted, setMounted] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
      <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05080f]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center 40%, rgba(6, 182, 212, 0.08) 0%, transparent 60%)",
        }}
      />
      <motion.div className="flex flex-col items-center gap-12">
        <motion.div
          variants={scaleIn}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative flex max-w-md items-center justify-center px-4 md:max-w-xl"
        >
          <motion.div
            className="pointer-events-none absolute -inset-20 rounded-full"
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              background:
                "radial-gradient(circle, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0.15) 30%, rgba(34,197,94,0.05) 50%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          <motion.div
            className="pointer-events-none absolute -inset-32 rounded-full"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            style={{
              background:
                "radial-gradient(circle, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.08) 30%, transparent 60%)",
              filter: "blur(80px)",
            }}
          />
          <div className="relative rounded-2xl border border-emerald-500/40 bg-slate-950/60 p-1 shadow-[0_0_20px_rgba(34,197,94,0.25),0_0_60px_rgba(34,197,94,0.1),inset_0_0_20px_rgba(34,197,94,0.05)]">
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
              style={{ mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", maskComposite: "exclude", WebkitMaskComposite: "xor" }}
            >
              <motion.div
                className="absolute -inset-[100%]"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                style={{
                  background: "conic-gradient(from 0deg, transparent 0%, rgba(34,197,94,0.6) 25%, transparent 50%, rgba(34,197,94,0.6) 75%, transparent 100%)",
                }}
              />
            </div>
            {videoError ? (
              <img
                src={fallbackImg}
                alt="DevPilot"
                className="relative h-auto w-full max-h-[55vh] object-contain"
              />
            ) : (
              <video
                src="/DevPilotSinFondo2.mp4"
                autoPlay
                loop
                muted
                playsInline
                onError={() => setVideoError(true)}
                className="relative h-auto w-full max-h-[55vh] object-contain"
              />
            )}
          </div>
        </motion.div>

        <motion.p
          className="text-base text-slate-400 md:text-lg"
          variants={fadeUp}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Understand code. Build faster.
        </motion.p>

        <motion.div variants={fadeUp} transition={{ duration: 0.6, ease: "easeOut" }}>
          <button
            onClick={onGetStarted}
            className="group relative rounded-[6px] border border-emerald-500/40 bg-emerald-500/10 px-8 py-3.5 text-base font-semibold text-emerald-300 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-500/20 hover:border-emerald-400/60 hover:text-emerald-200 hover:shadow-[0_0_30px_rgba(34,197,94,0.25)] active:translate-y-0"
          >
            Get Started
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
