import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dots: Dot[] = [];
    let animId: number;
    let startTime = performance.now();

    function buildDots(w: number, h: number): Dot[] {
      const count = Math.floor((w * h) / 25000);
      return Array.from({ length: Math.min(count, 60) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: 0.5 + Math.random() * 1,
        alpha: 0.15 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      dots = buildDots(canvas!.width, canvas!.height);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw(now: number) {
      const time = (now - startTime) / 1000;
      const ctx = canvas!.getContext("2d")!;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0) dot.x = canvas!.width;
        if (dot.x > canvas!.width) dot.x = 0;
        if (dot.y < 0) dot.y = canvas!.height;
        if (dot.y > canvas!.height) dot.y = 0;

        const pulse = 0.7 + 0.3 * Math.sin(time * 0.5 + dot.phase);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${dot.alpha * pulse})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
    />
  );
}
