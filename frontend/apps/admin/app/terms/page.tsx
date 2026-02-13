import Link from "next/link";

const EFFECTIVE_DATE = "2026-02-12";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">이용약관</h1>
          <p className="mt-2 text-sm text-slate-500">시행일: {EFFECTIVE_DATE}</p>
        </header>

        <section className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            본 약관은 주식회사 유니그린(이하 &quot;회사&quot;)이 제공하는 시공ON 서비스의 이용과 관련한
            권리, 의무 및 책임사항을 규정합니다.
          </p>
          <h2 className="text-base font-semibold text-slate-900">제1조 (서비스 제공)</h2>
          <p>
            회사는 누수/방수 시공 관리, 프로젝트 운영, 견적/문서 관리 기능을 제공합니다. 서비스 내용은
            운영 정책에 따라 변경될 수 있습니다.
          </p>
          <h2 className="text-base font-semibold text-slate-900">제2조 (회원의 의무)</h2>
          <p>
            회원은 계정 정보를 안전하게 관리해야 하며, 관련 법령 및 본 약관을 준수해야 합니다. 서비스
            오용, 권한 없는 접근, 타인의 권리 침해 행위는 금지됩니다.
          </p>
          <h2 className="text-base font-semibold text-slate-900">제3조 (책임의 제한)</h2>
          <p>
            회사는 천재지변, 통신 장애, 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않으며,
            법령이 허용하는 범위 내에서 손해배상 책임을 제한합니다.
          </p>
          <h2 className="text-base font-semibold text-slate-900">제4조 (약관 변경)</h2>
          <p>
            회사는 관련 법령을 준수하여 약관을 개정할 수 있으며, 중요한 변경 사항은 서비스 내 공지를
            통해 사전 안내합니다.
          </p>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600">
          문의:{" "}
          <a href="mailto:support@sigongon.com" className="text-brand-point-600 hover:underline">
            support@sigongon.com
          </a>
          <span className="mx-2 text-slate-300">|</span>
          <Link href="/privacy" className="text-brand-point-600 hover:underline">
            개인정보처리방침 보기
          </Link>
        </footer>
      </article>
    </main>
  );
}
