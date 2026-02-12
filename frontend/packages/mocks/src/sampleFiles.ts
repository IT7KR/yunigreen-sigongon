const SAMPLE_PREFIX = "sample/";

export const PROJECT_DOCUMENT_SAMPLE_MANIFEST: Record<string, string> = {
  c1: "sample/1. 관공서 계약서류/1. 견적내역서_연동경로당 외 1개소(성산1동 제2경로당) 도장 및 방수공사_25.08.26..xlsx",
  c2: "sample/1. 관공서 계약서류/2. 수의계약체결제한여부확인서_연동경로당 외 1개소(성산1동 제2경로당) 도장 및 방수공사.hwp",
  c3: "sample/1. 관공서 계약서류/3. 시방서_연동경로당 외 1개소(성산1동 제2경로당) 도장 및 방수공사.hwp",
  c4: "sample/1. 관공서 계약서류/4. 사업자외 서류_(주)유니그린개발.pdf",
  c5: "sample/1. 관공서 계약서류/5. 계약보증서_대경중학교 본관동 균열보수공사.pdf",
  c6: "sample/1. 관공서 계약서류/5-1. 계약보증금 지급각서.hwp",
  m1: "sample/2. 관공서 착공서류/0. 착공공문.hwp",
  m2: "sample/2. 관공서 착공서류/1. 착공신고서.hwp",
  m3: "sample/2. 관공서 착공서류/2. 재직증명서_이시대(현장대리인).hwp",
  m4: "sample/2. 관공서 착공서류/3. 계약내역서_하하호호 장난감도서관 잠실점 방수공사.xlsx",
  m5: "sample/2. 관공서 착공서류/4. 노무비 관련 서류.hwp",
  m6: "sample/2. 관공서 착공서류/5. 안전보건관리 준수 서약서.hwp",
  m7: "sample/2. 관공서 착공서류/6. 착공 전 사진.hwp",
  m8: "sample/2. 관공서 착공서류/7. 직접시공계획서.hwp",
  m9: "sample/2. 관공서 착공서류/8. 안전보건관리계획서(산업안전보건관리비 사용계획서 포함).hwp",
  s1: "sample/7. 공사일지/공사일지_방배중 외1교(역삼중)균열보수공사_25.08.08.hwp",
  s2: "sample/5. 일용신고 서류/서울시+건설일용근로자+표준근로계약서(2019.2_개정_서울계약마당).hwp",
  s3: "sample/8. 누수소견서(현장 점검 보고서)/1. 현장 점검 보고서_합격의 법학원.xlsx",
  p1: "sample/3. 관공서 준공서류/0. 준공공문.hwp",
  p2: "sample/3. 관공서 준공서류/1. 준공계.hwp",
  p3: "sample/3. 관공서 준공서류/2. 준공내역서.xlsx",
  p4: "sample/3. 관공서 준공서류/3. 준공정산동의서(준공금 변동이 있을 경우에만 작성).pdf",
  p5: "sample/3. 관공서 준공서류/준공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf",
  p6: "sample/3. 관공서 준공서류/5-1. 노무비 미체불확약서,지급내역서.hwp",
  p7: "sample/3. 관공서 준공서류/6. 산업안전보건관리비 집행내역 증빙자료.hwp",
  p8: "sample/3. 관공서 준공서류/7. 하자보수보증금 지급각서(발주처에서 요청하는 경우 하자보증증권으로 제출).hwp",
  p9: "sample/3. 관공서 준공서류/준공서류_대경중학교 본관동 균열보수공사.pdf",
  l1: "sample/5. 일용신고 서류/근로내용확인신고_전자신고용.xlsx",
  l2: "sample/5. 일용신고 서류/일용근로지급명세서 일괄등록 양식_일용근로소득_국세청 양식.xlsx",
  l3: "sample/5. 일용신고 서류/서울시+건설일용근로자+표준근로계약서(2019.2_개정_서울계약마당).hwp",
  v1: "sample/6. 민간 계약관련 서류(간단)/1. 공사도급표준계약서(공사 전 계약에 필요한 서류).hwp",
  h1: "sample/9. 학교 서류/공사서류 원클릭 프로그램(2025.3.수정)-서울시교육청용.xlsm",
  h2: "sample/9. 학교 서류/1. 수도전기공문.hwp",
};

export const PROJECT_MOCK_EXPORT_SAMPLE_FILES = {
  contractPdf:
    "sample/10. 공사계약서(나라장터, S2B)/나라장터 계약서.pdf",
  albumPdf:
    "sample/3. 관공서 준공서류/준공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf",
  startReportPdf:
    "sample/2. 관공서 착공서류/(최종스캔본) 착공서류_하하호호 장난감도서관 잠실점 방수 공사.pdf",
  completionReportPdf:
    "sample/3. 관공서 준공서류/준공서류_대경중학교 본관동 균열보수공사.pdf",
  laborKcomwelExcel: "sample/5. 일용신고 서류/근로내용확인신고_전자신고용.xlsx",
  laborNtsExcel:
    "sample/5. 일용신고 서류/일용근로지급명세서 일괄등록 양식_일용근로소득_국세청 양식.xlsx",
} as const;

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

export function getSamplePathForDocument(documentId: string): string | undefined {
  return PROJECT_DOCUMENT_SAMPLE_MANIFEST[documentId];
}

export function buildSamplePath(
  folderPath: string | undefined,
  fileName: string,
): string | null {
  if (!folderPath) {
    return null;
  }

  const normalizedFolder = folderPath.trim().replace(/\/+$/, "");

  if (!normalizedFolder) {
    return null;
  }

  return `${normalizedFolder}/${fileName}`;
}
