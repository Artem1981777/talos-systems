import { motion } from "framer-motion";

type Blob = {
  className: string;
  style: { background: string };
  animate: { x: number[]; y: number[] };
  duration: number;
};

const blobs: Blob[] = [
  {
    className: "absolute -top-40 left-1/4 h-[40rem] w-[40rem] rounded-full blur-[120px]",
    style: { background: "hsl(var(--primary) / 0.18)" },
    animate: { x: [0, 60, 0], y: [0, 40, 0] },
    duration: 16,
  },
  {
    className: "absolute top-24 right-1/4 h-[36rem] w-[36rem] rounded-full blur-[120px]",
    style: { background: "hsl(var(--accent) / 0.16)" },
    animate: { x: [0, -50, 0], y: [0, 60, 0] },
    duration: 20,
  },
  {
    className: "absolute bottom-[-10rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[120px]",
    style: { background: "hsl(275 100% 62% / 0.12)" },
    animate: { x: [0, 40, 0], y: [0, -30, 0] },
    duration: 24,
  },
];

const loop = (duration: number) => ({ duration, repeat: Infinity, ease: "easeInOut" } as const);

export default function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={b.className}
          style={b.style}
          animate={b.animate}
          transition={loop(b.duration)}
        />
      ))}
    </div>
  );
}
