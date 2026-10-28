"use client";
import { useEffect, useRef } from "react";

// A muted, looping background video for a photo band. People who prefer reduced motion see
// the poster frame instead, and the video stops while it is off screen.
export function BandVideo({ src, poster, position = "50% 50%" }: { src: string; poster: string; position?: string }) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (visible: boolean) => {
      if (still.matches || !visible) el.pause();
      else el.play().catch(() => { /* autoplay blocked: the poster stays */ });
    };
    const observer = new IntersectionObserver(([entry]) => sync(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(el);
    const onChange = () => sync(true);
    still.addEventListener("change", onChange);
    return () => { observer.disconnect(); still.removeEventListener("change", onChange); };
  }, []);

  return (
    <video
      ref={video}
      className="lx-band-media"
      style={{ objectPosition: position }}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
    />
  );
}
