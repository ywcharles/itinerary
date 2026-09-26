import Image from "next/image";
import type React from "react";
import { Caveat } from "next/font/google";

// Handwritten captions, like notes on real polaroids.
const hand = Caveat({ subsets: ["latin"], weight: ["600"] });

type Shot = { src: string; alt: string; caption: string; width: number; height: number };

// Photos from Unsplash (free to use under the Unsplash License), stored in public/collage.
const SHOTS: Record<string, Shot> = {
  venice: { src: "/collage/venice.jpg", alt: "Gondola on the Grand Canal in Venice", caption: "Venice", width: 640, height: 971 },
  paris: { src: "/collage/paris.jpg", alt: "Eiffel Tower over the Seine at dusk", caption: "Paris at dusk", width: 640, height: 426 },
  kyoto: { src: "/collage/kyoto.jpg", alt: "Old street with a pagoda in Kyoto", caption: "Kyoto", width: 640, height: 427 },
  planning: { src: "/collage/planning.jpg", alt: "Map, camera, notebook and backpack on a table", caption: "the plan ✏️", width: 640, height: 506 },
  dolomites: { src: "/collage/dolomites.jpg", alt: "Wooden boat on a turquoise mountain lake", caption: "Dolomites", width: 640, height: 427 },
  beach: { src: "/collage/beach.jpg", alt: "Beach at sunset", caption: "beach day 🌅", width: 640, height: 425 },
};

// Scattered over the whole page: position as a share of the page, width relative to the viewport, a tilt.
const LAYOUT: { shot: keyof typeof SHOTS; left: string; top: string; w: string; rotate: number }[] = [
  { shot: "venice", left: "-2%", top: "3%", w: "clamp(110px, 12vw, 190px)", rotate: -8 },
  { shot: "paris", left: "16%", top: "-4%", w: "clamp(140px, 16vw, 260px)", rotate: 4 },
  { shot: "beach", left: "44%", top: "-6%", w: "clamp(130px, 14vw, 230px)", rotate: -3 },
  { shot: "kyoto", left: "70%", top: "1%", w: "clamp(140px, 17vw, 270px)", rotate: 6 },
  { shot: "planning", left: "88%", top: "26%", w: "clamp(120px, 14vw, 220px)", rotate: -5 },
  { shot: "dolomites", left: "-3%", top: "50%", w: "clamp(140px, 17vw, 270px)", rotate: 5 },
  { shot: "planning", left: "30%", top: "40%", w: "clamp(120px, 13vw, 210px)", rotate: 8 },
  { shot: "venice", left: "58%", top: "38%", w: "clamp(100px, 10vw, 160px)", rotate: -6 },
  { shot: "beach", left: "82%", top: "66%", w: "clamp(140px, 18vw, 280px)", rotate: -4 },
  { shot: "kyoto", left: "18%", top: "78%", w: "clamp(130px, 15vw, 240px)", rotate: -7 },
  { shot: "paris", left: "50%", top: "80%", w: "clamp(130px, 14vw, 230px)", rotate: 5 },
];

/**
 * A scrapbook of travel polaroids covering the whole page behind the content,
 * softened by a wash in the page color so text on top stays readable (light and dark mode).
 */
export default function TravelCollage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {LAYOUT.map(({ shot, left, top, w, rotate }, index) => {
        const photo = SHOTS[shot];
        return (
          <div
            key={index}
            className="absolute rotate-(--tilt)"
            style={{ left, top, width: w, "--tilt": `${rotate}deg` } as React.CSSProperties}
          >
            {/* Polaroid: always a white frame with dark handwriting. */}
            <div className="relative rounded-[3px] bg-white p-[5%] pb-[18%] shadow-[0_10px_25px_-8px_rgba(0,0,0,0.35)]">
              <Image
                src={photo.src}
                alt=""
                width={photo.width}
                height={photo.height}
                sizes="280px"
                // Background photos load right away (lazy loading left empty frames lower on the page).
                loading="eager"
                className="block h-auto w-full"
              />
              <span className={`${hand.className} absolute inset-x-0 bottom-[3%] text-center text-[clamp(0.8rem,1.3vw,1.25rem)] leading-none text-[#3b3b3b]`}>
                {photo.caption}
              </span>
            </div>
            {/* A strip of tape holding it to the page. */}
            <span className="absolute -top-[6%] left-1/2 h-[12%] w-[34%] -translate-x-1/2 rotate-[-4deg] bg-[#f5e9c8]/70 shadow-sm" />
          </div>
        );
      })}
      {/* Wash over the photos: lighter at the edges, strongest behind the headline and form. */}
      <div className="absolute inset-0 bg-canvas/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_30%_40%,var(--color-canvas)_35%,transparent_100%)]" />
      <span className="absolute bottom-2 right-3 text-xs text-muted">Photos: Unsplash</span>
    </div>
  );
}
