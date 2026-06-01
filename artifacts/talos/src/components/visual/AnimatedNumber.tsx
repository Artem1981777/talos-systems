import { useEffect } from "react";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
};

export default function AnimatedNumber(props: Props) {
  const { value, prefix = "", suffix = "", decimals = 0, className = "" } = props;
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => prefix + v.toFixed(decimals) + suffix);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return controls.stop;
  }, [value]);
  return <motion.span className={className}>{text}</motion.span>;
}
