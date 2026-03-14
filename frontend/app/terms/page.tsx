import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { termsDocument } from "@/lib/legal/terms";

export default function TermsPage() {
  return (
    <LegalPageLayout
      document={termsDocument}
      crossLinkHref="/privacy"
      crossLinkLabel="개인정보처리방침 보기"
    />
  );
}
