"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll (27 Sept): the block fades and slides up as it comes into
 * view, the way payadvantage.com.au keeps showing the next thing as you
 * scroll. It renders VISIBLE on the server, so the page reads without
 * JavaScript and search engines see everything; only blocks that are below
 * the fold when the page loads are hidden, and only until they arrive.
 * People who asked their phone for less motion get no movement at all.
 *
 *   <Reveal delay={0.15}>...</Reveal>
 */
export default function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const ref = useRef(null);
  const [state, setState] = useState("still"); // still | hidden | in

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return; // already on screen: leave it
    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`tc-reveal ${state === "hidden" ? "tc-reveal-hidden" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
