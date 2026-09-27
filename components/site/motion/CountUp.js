"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up when it scrolls into view. The figure itself is
 * the caller's - this only animates it. Rendered as the final number on the
 * server so the page is right without JavaScript.
 *
 *   <CountUp to={3} />   <CountUp to={2} suffix=" min" />
 */
export default function CountUp({ to, prefix = "", suffix = "", duration = 1.4, className = "" }) {
  const ref = useRef(null);
  const [n, setN] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const ms = duration * 1000;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / ms);
          const eased = 1 - Math.pow(1 - t, 3);
          setN(Math.round(to * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        setN(0);
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {n}
      {suffix}
    </span>
  );
}
