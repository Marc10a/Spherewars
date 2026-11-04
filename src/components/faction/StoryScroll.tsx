"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type Chapter = { title: string; text: string; image: string };

/** Story told while scrolling: the text moves and the painting beside it changes with each chapter. */
export function StoryScroll({ chapters, note }: { chapters: Chapter[]; note?: string }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i)); }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2 lg:gap-16">
      <div className="relative hidden lg:block">
        <div className="sticky top-24 h-[calc(100svh-8rem)] overflow-hidden border border-accent/30">
          {chapters.map((c, i) => (
            <Image key={c.image + i} src={c.image} alt="" fill sizes="50vw" loading="lazy"
              className={`object-cover transition-[opacity,transform,filter] duration-700 ease-out motion-reduce:transition-none ${i === active ? "scale-100 opacity-100 blur-0" : "scale-110 opacity-0 blur-sm"}`} />
          ))}
          <ol aria-hidden className="absolute bottom-4 left-4 flex gap-2">
            {chapters.map((c, i) => <li key={c.title} className={`h-1 w-10 transition-colors duration-300 ${i === active ? "bg-accent" : "bg-ivory/30"}`} />)}
          </ol>
        </div>
      </div>
      <div>
        {note && <p className="mb-6 text-sm text-stone">{note}</p>}
        {chapters.map((c, i) => (
          <article key={c.title} data-i={i} ref={(el) => { refs.current[i] = el; }} className="flex flex-col justify-center py-8 lg:min-h-[85svh]">
            <div className="relative mb-6 aspect-video overflow-hidden lg:hidden">
              <Image src={c.image} alt="" fill sizes="100vw" loading="lazy" className="object-cover" />
            </div>
            <span aria-hidden className="font-display text-7xl leading-none text-accent/40">{i + 1}</span>
            <h3 lang="es" className="mt-3 font-display text-4xl leading-tight md:text-5xl">{c.title}</h3>
            <p lang="es" className="mt-5 max-w-xl text-lg leading-relaxed text-ivory/90">{c.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
