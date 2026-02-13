import Link from "next/link";

const EFFECTIVE_DATE = "2026-02-12";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">개인정보처리방침</h1>
          <p className="mt-2 text-sm text-slate-500">시행일: {EFFECTIVE_DATE}</p>
        </header>

        <section className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
          <h2 className="text-base font-semibold text-slate-900">1. 수집 항목</h2>
          <p>
            회사는 회원가입, 서비스 제공 및 고객 지원을 위해 이름, 이메일, 연락처, 소속 정보 등 필요한
            최소한의 개인정보를 수집합니다.
          </p>
          <h2 className="text-base font-semibold text-slate-900">2. 이용 목적</h2>
          <p>
            수집한 개인정보는 계정 인증, 프로젝트 운영, 서비스 고지, 고객 문의 대응, 법령상 의무 이행을
            위해 사용됩니다.
          </p>
          <h2 className="text-base font-semibold text-slate-900">3. 보관 기간</h2>
          <p>
            회사는 개인정보 처리 목적 달성 시 지체 없이 파기하며, 관련 법령에 따라 일정 기간 보관이
            필요한 경우 해당 기간 동안 안전하게 보관합니다.
          </p>
          <h2 className="text-base font-semibold text-slate-900">4. 이용자 권리</h2>
          <p>
            이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있으며, 회사는 관련 법령에
            따라 신속하게 처리합니다.
          </p>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-600">
          문의:{" "}
          <a href="mailto:support@sigongon.com" className="text-brand-point-600 hover:underline">
            support@sigongon.com
          </a>
          <span className="mx-2 text-slate-300">|</span>
          <Link href="/terms" className="text-brand-point-600 hover:underline">
            이용약관 보기
          </Link>
        </footer>
      </article>
    </main>
  );
}
