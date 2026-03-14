import { Shield } from "lucide-react";
import type { LegalDocument } from "@/lib/legal/types";
import { LegalTableOfContents } from "./LegalTableOfContents";

interface LegalPageLayoutProps {
  document: LegalDocument;
  crossLinkHref: string;
  crossLinkLabel: string;
}

export function LegalPageLayout({
  document,
  crossLinkHref,
  crossLinkLabel,
}: LegalPageLayoutProps) {
  const tocSections = document.sections.map((s) => ({ id: s.id, title: s.title }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">

        {/* Header Card */}
        <div className="rounded-t-2xl bg-brand-primary-50 border border-brand-primary-100 p-6 mb-0">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-brand-primary-700 flex-shrink-0" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-brand-primary-700">
                {document.title}
              </h1>
              {document.subtitle && (
                <p className="text-sm text-brand-primary-600 mt-0.5">
                  {document.subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-brand-primary-600">
            <span>주식회사 유니그린 | 시공코어 서비스</span>
            <span>시행일: {document.effectiveDate}</span>
            <span>버전: v{document.version}.0</span>
          </div>
        </div>

        {/* Content area */}
        <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 md:p-8 shadow-sm">

          {/* Desktop: 2-column layout with sidebar TOC */}
          <div className="flex flex-col md:flex-row gap-8">

            {/* Sidebar TOC — component renders both mobile (sticky top pills) and desktop (sticky sidebar) */}
            <aside className="hidden md:block w-56 flex-shrink-0">
              <LegalTableOfContents sections={tocSections} />
            </aside>

            {/* Main content */}
            <article className="flex-1 min-w-0">
              {document.sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className={index > 0 ? "border-t border-slate-100 pt-8 mt-8" : ""}
                >
                  <h2 className="text-base font-semibold text-slate-900 mb-3">
                    {section.title}
                  </h2>
                  {section.content.map((para, i) => (
                    <p key={i} className="text-[15px] leading-8 text-slate-600 mb-2">
                      {para}
                    </p>
                  ))}
                  {section.subsections?.map((sub, si) => (
                    <div key={si} className="ml-4 mt-4">
                      <h3 className="text-sm font-medium text-slate-800 mb-2">
                        {sub.title}
                      </h3>
                      {sub.content.map((para, pi) => (
                        <p key={pi} className="text-sm leading-7 text-slate-600 mb-1">
                          {para}
                        </p>
                      ))}
                    </div>
                  ))}
                </section>
              ))}
            </article>
          </div>

          {/* Footer */}
          <footer className="mt-10 border-t border-slate-200 pt-6">
            <div className="text-sm text-slate-600 space-y-1">
              <p>주식회사 유니그린 | 사업자등록번호: [000-00-00000] | 대표자: [OOO]</p>
              <p>주소: [서울특별시 OO구 OO로 OO]</p>
              <p>
                문의:{" "}
                <a
                  href="mailto:support@sigongcore.com"
                  className="text-brand-point-600 hover:underline"
                >
                  support@sigongcore.com
                </a>
                <span className="mx-2 text-slate-300">|</span>
                <a href={crossLinkHref} className="text-brand-point-600 hover:underline">
                  {crossLinkLabel}
                </a>
              </p>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
