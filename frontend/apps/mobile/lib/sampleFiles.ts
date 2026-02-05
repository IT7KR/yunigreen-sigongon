const SAMPLE_PREFIX = "sample/";

export const MOBILE_MOCK_EXPORT_SAMPLE_FILES = {
  albumPdf:
    "sample/3. 관공서 준공서류/준공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf",
  startReportPdf:
    "sample/2. 관공서 착공서류/(최종스캔본) 착공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf",
  completionReportPdf:
    "sample/3. 관공서 준공서류/준공서류_대경중학교 본관동 균열보수공사.pdf",
  estimateXlsx:
    "sample/1. 관공서 계약서류/1. 견적내역서_연동경로당 외 1개소(성산1동 제2경로당) 도장 및 방수공사_25.08.26..xlsx",
  contractPdf: "sample/10. 공사계약서(나라장터, S2B)/나라장터 계약서.pdf",
} as const;

export function normalizeSamplePath(samplePath: string): string {
  const normalized = samplePath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith(SAMPLE_PREFIX)) {
    return normalized.slice(SAMPLE_PREFIX.length);
  }
  return normalized;
}

export function buildSampleFileDownloadUrl(samplePath: string): string {
  const params = new URLSearchParams({ path: normalizeSamplePath(samplePath) });
  return `/api/sample-files?${params.toString()}`;
}
