"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const images = [
  "https://picsum.photos/id/1015/1200/1600",
  "https://picsum.photos/id/1011/1200/1600",
  "https://picsum.photos/id/1025/1200/1600",
  "https://picsum.photos/id/1043/1200/1600",
  "https://picsum.photos/id/1057/1200/1600",
];

const captions = [
  "Empower your teams with insight-driven decision making.",
  "Collaborate securely from anywhere in the world.",
  "Transform data into meaningful outcomes for clients.",
  "Deliver consistent excellence with streamlined workflows.",
  "Innovate boldly with a trusted technology partner.",
];

export function LoginCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((index) => (index + 1) % images.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-border/40 bg-background/30">
      {images.map((src, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            key={src}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-all duration-1000 ease-out ${
              isActive
                ? "opacity-100 scale-100"
                : "pointer-events-none scale-105 opacity-0"
            }`}
          >
            <Image
              alt="Corporate imagery"
              className="object-cover"
              fill
              priority={index === 0}
              sizes="(max-width: 1024px) 100vw, 40vw"
              src={src}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/80 via-background/20 to-background/5" />
            <div className="absolute bottom-10 left-10 right-10 space-y-4 rounded-3xl bg-background/70 p-6 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.8)] backdrop-blur">
              <div className="h-1 w-16 rounded-full bg-primary" />
              <p className="text-lg font-medium text-foreground/90 md:text-xl">
                {captions[index]}
              </p>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3">
        {images.map((_, index) => {
          const isActive = index === activeIndex;

          return (
            <span
              key={index}
              aria-hidden
              className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${
                isActive ? "bg-primary" : "bg-foreground/30"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
