import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { privacyDocument } from "@/lib/legal/privacy";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      document={privacyDocument}
      crossLinkHref="/terms"
      crossLinkLabel="이용약관 보기"
    />
  );
}
