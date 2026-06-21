import { Link } from "@tanstack/react-router";
import logoSvgRaw from "@/assets/asuka-one.svg?raw";

// Preprocess once at module load time (not on every render):
// 1. Remove white background rect so the SVG is transparent
// 2. Remove fixed width/height attributes so CSS controls the size via viewBox
const logoHtml = logoSvgRaw
  .replace(/<rect id="background"[^/]*\/>\n?/g, "")
  .replace(/(<svg[^>]*)\s+width="3000"\s+height="1000"/, "$1");

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      {/*
       * Inline SVG so CSS can reach internal group elements.
       * [&>svg]:h-full [&>svg]:w-auto  — SVG scales to container height,
       *   width auto-calculated from viewBox 3000:1000 aspect ratio.
       * dark:[&_#icon-navy_g]:!fill-white     — #092743 navy → white in dark mode
       * dark:[&_#wordmark-navy_g]:!fill-white — same for "ASUKA" wordmark
       * Teal (#239D91) and orange (#F6A51A) are already readable on dark bg.
       */}
      <div
        className="
          h-12 md:h-14 lg:h-[4.5rem]
          [&>svg]:h-full
          [&>svg]:w-auto
          dark:[&_#icon-navy_g]:!fill-white
          dark:[&_#wordmark-navy_g]:!fill-white
        "
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: logoHtml }}
        aria-label="Asuka One"
        role="img"
      />
    </Link>
  );
}
