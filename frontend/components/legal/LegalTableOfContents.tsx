"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

interface LegalTableOfContentsProps {
  sections: Array<{ id: string; title: string }>;
  className?: string;
}

export function LegalTableOfContents({
  sections,
  className,
}: LegalTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-10% 0px -85% 0px" },
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleItemClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={className}>
      {/* Mobile: horizontal scrollable pills */}
      <div className="md:hidden sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 -mx-4 px-4 py-2">
        <nav aria-label="목차">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {sections.map(({ id, title }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleItemClick(id)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full transition-colors ${
                  activeId === id
                    ? "bg-brand-point-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {title}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Desktop: vertical sticky sidebar */}
      <div className="hidden md:flex flex-col sticky top-8 w-56">
        <nav>
          <ul className="space-y-0.5">
            {sections.map(({ id, title }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => handleItemClick(id)}
                  aria-current={activeId === id ? "location" : undefined}
                  className={`py-1.5 px-3 text-sm w-full text-left transition-colors ${
                    activeId === id
                      ? "border-l-2 border-brand-point-500 text-brand-point-600 font-medium bg-brand-point-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Floating scroll-to-top button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-4 z-20 rounded-full bg-brand-point-600 p-2 text-white shadow-lg hover:bg-brand-point-700 transition-colors"
          aria-label="맨 위로"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
