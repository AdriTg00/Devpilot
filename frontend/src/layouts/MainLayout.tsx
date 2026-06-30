import { AnimatePresence, motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";

import ErrorBoundary from "../components/error/ErrorBoundary";
import Navbar from "../components/layout/Navbar";
import Particles from "../components/effects/Particles";
import WelcomeHero from "../components/welcome/WelcomeHero";
import HotkeysHelp from "../components/hotkeys/HotkeysHelp";
import BackendStatusOverlay from "../components/backend/BackendStatusOverlay";
import { useWelcome } from "../components/welcome/WelcomeProvider";

const navVariants = {
  hidden: { opacity: 0, y: -40 },
  visible: { opacity: 1, y: 0 },
};

const contentVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function MainLayout() {
  const { welcomed, completeWelcome } = useWelcome();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      <Particles />
      {!reducedMotion && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="pointer-events-none fixed inset-0 mx-auto h-full w-full object-contain"
          style={{ opacity: 0.04, maxWidth: "min(80vw, 800px)" }}
          aria-hidden="true"
        >
          <source src="/DevPilotSinFondo2.mp4" type="video/mp4" />
        </video>
      )}

      <AnimatePresence>
        {!welcomed && (
          <WelcomeHero onGetStarted={completeWelcome} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {welcomed && (
          <motion.div
            key="dashboard"
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex h-screen flex-col"
          >
            <motion.div
              variants={navVariants}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
              <Navbar />
            </motion.div>
            <motion.main
              className="flex-1 overflow-auto p-4 md:p-8"
              variants={contentVariants}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            >
              <div className="mx-auto w-full max-w-7xl">
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </div>
        </motion.main>
            </motion.div>
          )}
        </AnimatePresence>
        <HotkeysHelp />
        <BackendStatusOverlay />
      </div>
  );
}
