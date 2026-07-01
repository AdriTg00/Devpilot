import { useEffect, useRef } from "react";

const EMERALD = { r: 16, g: 185, b: 129 };
const TEAL = { r: 45, g: 212, b: 191 };

function drawLine(
  ctx: CanvasRenderingContext2D,
  y: number,
  w: number,
  alpha: number,
) {
  const grad = ctx.createLinearGradient(0, y, w, y);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(0.1, `rgba(${EMERALD.r}, ${EMERALD.g}, ${EMERALD.b}, ${alpha * 0.4})`);
  grad.addColorStop(0.35, `rgba(${EMERALD.r}, ${EMERALD.g}, ${EMERALD.b}, ${alpha})`);
  grad.addColorStop(0.5, `rgba(${TEAL.r}, ${TEAL.g}, ${TEAL.b}, ${alpha * 0.9})`);
  grad.addColorStop(0.65, `rgba(${EMERALD.r}, ${EMERALD.g}, ${EMERALD.b}, ${alpha})`);
  grad.addColorStop(0.9, `rgba(${EMERALD.r}, ${EMERALD.g}, ${EMERALD.b}, ${alpha * 0.4})`);
  grad.addColorStop(1, "transparent");

  ctx.save();

  ctx.shadowColor = `rgba(${EMERALD.r}, ${EMERALD.g}, ${EMERALD.b}, ${alpha * 0.15})`;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();

  ctx.restore();
}

export default function NeonCables() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    const startTime = performance.now();
    const lineCount = 10;

    function positions(h: number): number[] {
      const step = h / (lineCount + 1);
      const offset = (h - step * (lineCount + 1)) / 2;
      return Array.from({ length: lineCount }, (_, i) =>
        offset + step * (i + 1),
      );
    }

    let ys = positions(window.innerHeight);

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      ys = positions(window.innerHeight);
    }

    resize();
    window.addEventListener("resize", resize);

    function draw(now: number) {
      const time = (now - startTime) / 2000;
      const ctx = canvas!.getContext("2d")!;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const y of ys) {
        const alpha = 0.12 + 0.08 * Math.sin(time + y * 0.01);
        drawLine(ctx, y, canvas!.width, alpha);
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
