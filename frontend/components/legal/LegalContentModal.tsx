"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@sigongcore/ui";
import type { LegalDocument } from "@/lib/legal/types";

interface LegalContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LegalDocument;
  onConfirm?: () => void;
}

export function LegalContentModal({
  isOpen,
  onClose,
  document,
  onConfirm,
}: LegalContentModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setScrollProgress(0);
      return;
    }

    // Modal renders children inside div.mt-4.overflow-y-auto — that's containerRef's parentElement
    const container = containerRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll <= 0 ? 100 : (scrollTop / maxScroll) * 100;
      setScrollProgress(progress);
    };

    // Initial check in case content fits without scrolling
    handleScroll();

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document.title}
      size="2xl"
      closeOnBackdropClick={false}
    >
      <div ref={containerRef}>
        {/* Scroll progress bar */}
        <div className="sticky top-0 -mx-6 z-10 mb-4">
          <div className="h-0.5 bg-slate-100">
            <div
              className="h-full bg-brand-point-500 transition-all duration-100"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>

        {/* Document metadata */}
        <p className="text-xs text-slate-500 mb-4">
          시행일: {document.effectiveDate} | v{document.version}.0
        </p>

        {document.subtitle && (
          <p className="text-sm text-slate-600 mb-6">{document.subtitle}</p>
        )}

        {/* Sections */}
        {document.sections.map((section, index) => (
          <div
            key={section.id}
            id={section.id}
            className={
              index > 0 ? "border-t border-slate-100 pt-6 mt-6" : ""
            }
          >
            <h2 className="text-base font-semibold text-slate-900 mb-3">
              {section.title}
            </h2>

            {section.content.map((para, i) => (
              <p key={i} className="text-sm leading-7 text-slate-600 mb-2">
                {para}
              </p>
            ))}

            {section.subsections?.map((sub, si) => (
              <div key={si} className="ml-4 mt-3">
                <h3 className="text-sm font-medium text-slate-800 mb-1">
                  {sub.title}
                </h3>
                {sub.content.map((para, pi) => (
                  <p
                    key={pi}
                    className="text-sm leading-6 text-slate-600 mb-1"
                  >
                    {para}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Confirm button */}
        <div className="mt-8 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-lg bg-brand-point-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-point-700 transition-colors"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </Modal>
  );
}
