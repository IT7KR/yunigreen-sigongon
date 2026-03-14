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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Reset scroll position and progress when modal opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      setScrollProgress(0);
    }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const progress =
      scrollHeight <= clientHeight
        ? 100
        : (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollProgress(progress);
  };

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
      {/* Scroll progress bar */}
      <div className="sticky top-0 -mx-6 z-10">
        <div className="h-0.5 bg-slate-100">
          <div
            className="h-full bg-brand-point-500 transition-all duration-100"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      {/* Self-contained scrollable content — no reliance on Modal internals */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto max-h-[calc(70vh-10rem)] mt-4"
      >
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
      </div>

      {/* Confirm button — outside scroll area */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full rounded-lg bg-brand-point-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-point-700 transition-colors"
        >
          확인했습니다
        </button>
      </div>
    </Modal>
  );
}
