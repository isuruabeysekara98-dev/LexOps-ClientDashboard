"use client";

import Image from "next/image";

type Logo = { src: string; alt: string };

const logos: Logo[] = [
  { src: "/clients/betts-law-co.webp", alt: "Betts Law Co" },
  { src: "/clients/stainton-chellew.webp", alt: "Stainton-Chellew" },
  { src: "/clients/attune-legal.webp", alt: "Attune Legal" },
  { src: "/clients/warlows-legal.webp", alt: "Warlows Legal" },
  { src: "/clients/palmos-legal.webp", alt: "Palmos Legal" },
  { src: "/clients/client-06.webp", alt: "Client" },
  { src: "/clients/client-07.webp", alt: "Client" },
];

/**
 * Infinite, continuously-scrolling horizontal logo marquee.
 * The logo set is duplicated so the loop is seamless. Pauses on hover.
 * Logos sit on a dark ribbon so white-on-transparent marks stay visible.
 */
export default function ClientMarquee() {
  // Two copies for a seamless -50% translate loop.
  const track = [...logos, ...logos];

  return (
    <div className="group relative w-full overflow-hidden">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-dark-gray to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-dark-gray to-transparent" />

      <div className="lexops-marquee flex w-max items-center gap-16 py-2 group-hover:[animation-play-state:paused]">
        {track.map((logo, i) => (
          <div
            key={`${logo.src}-${i}`}
            className="relative flex h-12 w-[160px] shrink-0 items-center justify-center"
          >
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              sizes="160px"
              className="object-contain opacity-80 transition-opacity duration-200 hover:opacity-100"
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .lexops-marquee {
          animation: lexops-scroll 38s linear infinite;
        }
        @keyframes lexops-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lexops-marquee {
            animation-duration: 90s;
          }
        }
      `}</style>
    </div>
  );
}
