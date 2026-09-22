"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * How far the page has to move before the bar stops counting as part of the hero photo. A few
 * pixels is enough: the bar should answer the first movement of the page, not a whole section.
 */
const SCROLL_THRESHOLD = 8;

export interface ScrollHeaderProps {
  children: ReactNode;
  className?: string;
}

/**
 * The landing page bar. At the top of the page it stays invisible - no fill, no divider, no blur -
 * so the hero photo runs through it and the first screen reads as a single image. Once the page
 * moves it takes the app surface back (tinted, blurred, hairline divider) so its links stay
 * legible over whatever scrolls underneath.
 */
export function ScrollHeader({ children, className }: ScrollHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };

    // A wheel or a drag can fire dozens of events per frame and every one of them would
    // re-render the bar, so read the offset once per frame instead. Setting the state only when
    // the boolean changes keeps a scroll through the page from re-rendering at all.
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(read);
    };

    // The page can open already scrolled: a refresh halfway down, or a deep link to a section.
    read();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        "landing-nav sticky top-0 z-50",
        // The divider is drawn inside the bar rather than as a border: a border would add a
        // pixel to the bar height, the hero pulls itself up by exactly
        // `--landing-nav-height`, and the photo would stop one row short of the viewport top.
        "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-transparent",
        "transition-[background-color,backdrop-filter] duration-200 ease-out motion-reduce:transition-none",
        "after:transition-colors",
        // The fill stays light and the blur does the work: a heavy tint would read as a black
        // slab sitting on top of the page, and the hero's blue would break against it as the bar
        // passes over it. Kept frosted, the bar takes the colour of whatever is underneath,
        // which is what keeps the page feeling continuous. The heavier tint is the fallback for
        // a browser without `backdrop-filter`, where nothing would soften the content.
        scrolled && [
          "bg-background/80 supports-[backdrop-filter]:bg-background/55",
          "backdrop-blur-xl after:bg-border/60",
        ],
        className,
      )}
    >
      {children}
    </header>
  );
}
