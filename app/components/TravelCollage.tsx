import Image from "next/image";
import type React from "react";
import { Caveat } from "next/font/google";

// Handwritten captions, like notes on real polaroids.
const hand = Caveat({ subsets: ["latin"], weight: ["600"] });

type Photo = {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
  // Position and size as a share of the collage box, and a slight tilt.
  left: string;
  top: string;
  w: string;
  rotate: number;
  z: number;
};

// Photos from Unsplash (free to use under the Unsplash License), stored in public/collage.
const PHOTOS: Photo[] = [
  { src: "/collage/venice.jpg", alt: "Gondola on the Grand Canal in Venice", caption: "Venice", width: 640, height: 971, left: "1%", top: "6%", w: "31%", rotate: -7, z: 2 },
  { src: "/collage/paris.jpg", alt: "Eiffel Tower over the Seine at dusk", caption: "Paris at dusk", width: 640, height: 426, left: "29%", top: "0%", w: "42%", rotate: 3, z: 1 },
  { src: "/collage/kyoto.jpg", alt: "Old street with a pagoda in Kyoto", caption: "Kyoto", width: 640, height: 427, left: "60%", top: "17%", w: "39%", rotate: 7, z: 3 },
  { src: "/collage/planning.jpg", alt: "Map, camera, notebook and backpack on a table", caption: "the plan ✏️", width: 640, height: 506, left: "31%", top: "36%", w: "36%", rotate: -3, z: 5 },
  { src: "/collage/dolomites.jpg", alt: "Wooden boat on a turquoise mountain lake", caption: "Dolomites", width: 640, height: 427, left: "3%", top: "58%", w: "40%", rotate: 5, z: 4 },
  { src: "/collage/beach.jpg", alt: "Beach at sunset", caption: "beach day 🌅", width: 640, height: 425, left: "57%", top: "62%", w: "41%", rotate: -5, z: 4 },
];

export default function TravelCollage() {
  return (
    <figure className="relative mx-auto w-full max-w-[540px]">
      <div className="relative aspect-square w-full">
        {PHOTOS.map((photo) => (
          <div
            key={photo.src}
            // The tilt lives in a CSS variable so hovering can straighten the photo.
            className="group absolute rotate-(--tilt) transition-[rotate,scale] duration-300 ease-out hover:!z-30 hover:rotate-0 hover:scale-105"
            style={{ left: photo.left, top: photo.top, width: photo.w, zIndex: photo.z, "--tilt": `${photo.rotate}deg` } as React.CSSProperties}
          >
            {/* Polaroid: always a white frame with dark handwriting, also in dark mode. */}
            <div className="rounded-[3px] bg-white p-[5%] pb-[18%] shadow-[0_10px_25px_-8px_rgba(0,0,0,0.35)] transition-shadow group-hover:shadow-[0_18px_35px_-10px_rgba(0,0,0,0.45)]">
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 1024px) 45vw, 240px"
                priority
                className="block h-auto w-full"
              />
              <span
                className={`${hand.className} absolute inset-x-0 bottom-[3%] text-center text-[clamp(0.9rem,2.4vw,1.35rem)] leading-none text-[#3b3b3b]`}
              >
                {photo.caption}
              </span>
            </div>
            {/* A strip of tape holding it to the page. */}
            <span
              aria-hidden
              className="absolute -top-[6%] left-1/2 h-[12%] w-[34%] -translate-x-1/2 rotate-[-4deg] bg-[#f5e9c8]/70 shadow-sm backdrop-blur-[1px]"
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-right text-xs text-muted">Photos: Unsplash</figcaption>
    </figure>
  );
}
