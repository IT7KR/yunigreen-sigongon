/**
 * Excel Export Module for Korean Daily Labor Payroll Reporting
 *
 * Provides functions to generate Excel reports for labor management:
 * - Site-specific payroll reports (현장별 일용신고명세서)
 * - Monthly consolidated reports (월별 통합본)
 * - KWDI insurance reports (근로복지공단 전자신고 양식 — 근로내용확인신고서)
 * - National tax reports (국세청 일용근로소득 지급명세서 일괄등록 양식)
 */

import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import type {
  SitePayrollReport,
  MonthlyConsolidatedReport,
} from "@sigongon/types"

// ============================================
// Code Mapping Constants
// ============================================

/**
 * 근로복지공단 보험구분 코드
 * 1: 산재보험만, 3: 고용보험만, 5: 산재+고용보험
 */
export const KWDI_INSURANCE_TYPES = {
  "1": "산재보험",
  "3": "고용보험",
  "5": "산재+고용보험",
} as const

/**
 * 근로복지공단 이직사유 코드
 * 1: 회사 사정에 의한 이직 (폐업, 공사중단, 공사종료, 계약기간 만료 등)
 */
export const KWDI_SEPARATION_CODES = {
  "1": "회사의 사정에 의한 이직",
  "2": "근로자의 귀책사유로 인한 이직",
  "3": "자진퇴사",
} as const

/**
 * 근로복지공단 국적 코드 (주요 코드)
 * 전체 코드: http://www.4insure.or.kr/pbiz/cmmn/selectComCdList.do?comCdClsfId=A151
 */
export const KWDI_NATIONALITY_CODES: Record<string, string> = {
  "100": "한국",
  "156": "중국",
  "392": "일본",
  "410": "대한민국(재외동포)",
  "458": "말레이시아",
  "608": "필리핀",
  "626": "동티모르",
  "704": "베트남",
  "764": "태국",
  "860": "우즈베키스탄",
} as const

/**
 * 근로복지공단 주요 직종 코드 (건설업)
 * 전체 코드: http://www.4insure.or.kr/pbiz/cmmn/selectComCdList.do?comCdClsfId=D108
 */
export const KWDI_JOB_CODES: Record<string, string> = {
  "013": "건설.채국.제조.생산 관리자",
  "701": "건설구조 기능원",
  "704": "건설.채국 기계 운전원",
  "705": "기타 건설 기능원(채굴포함)",
  "706": "건설.채국 단순 종사자",
} as const

// ============================================
// Utility Functions
// ============================================

/**
 * Apply standard cell styling
 */
function applyCellStyle(
  cell: ExcelJS.Cell,
  options: {
    bold?: boolean
    bgColor?: string
    fontColor?: string
    alignment?: Partial<ExcelJS.Alignment>
    numFmt?: string
    border?: boolean
    fontSize?: number
  }
) {
  if (options.bold || options.fontSize) {
    cell.font = {
      ...cell.font,
      bold: options.bold,
      size: options.fontSize,
    }
  }

  if (options.bgColor) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: options.bgColor },
    }
  }

  if (options.fontColor) {
    cell.font = { ...cell.font, color: { argb: options.fontColor } }
  }

  if (options.alignment) {
    cell.alignment = { ...cell.alignment, ...options.alignment }
  }

  if (options.numFmt) {
    cell.numFmt = options.numFmt
  }

  if (options.border) {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    }
  }
}

/**
 * Create report header with title and information block
 */
function createReportHeader(
  worksheet: ExcelJS.Worksheet,
  options: {
    title: string
    companyName?: string
    projectName?: string
    year: number
    month: number
    extraInfo?: Array<[string, string]>
  }
): number {
  // Title row - merged across columns A to G
  const titleRow = worksheet.addRow([options.title])
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, 7)
  const titleCell = titleRow.getCell(1)
  titleCell.font = { bold: true, size: 16 }
  titleCell.alignment = { horizontal: "center", vertical: "middle" }
  titleRow.height = 30

  // Empty row after title
  worksheet.addRow([])

  // Info block
  const infoRows: Array<[string, string | number]> = []
  if (options.companyName) infoRows.push(["회사명:", options.companyName])
  if (options.projectName) infoRows.push(["현장명:", options.projectName])
  infoRows.push(["년도:", options.year])
  infoRows.push(["월:", `${options.month}월`])
  if (options.extraInfo) {
    for (const [label, value] of options.extraInfo) {
      infoRows.push([label, value])
    }
  }

  for (const [label, value] of infoRows) {
    const row = worksheet.addRow([label, value])
    row.getCell(1).font = { bold: true, size: 10 }
    row.getCell(2).font = { size: 10 }
    row.height = 18
  }

  // Empty row before data
  worksheet.addRow([])

  return worksheet.rowCount
}

/**
 * Create header row for payroll reports
 */
function createPayrollHeaders(worksheet: ExcelJS.Worksheet) {
  const headers = [
    "No.",
    "성명",
    "직종",
    "주민번호",
    "단가",
    ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
    "출력일수",
    "공수",
    "노무비",
    "갑근세",
    "주민세",
    "건강보험",
    "요양보험",
    "국민연금",
    "고용보험",
    "공제계",
    "차감지급액",
  ]

  const headerRow = worksheet.addRow(headers)

  headerRow.eachCell((cell) => {
    applyCellStyle(cell, {
      bold: true,
      bgColor: "FF4472C4",
      fontColor: "FFFFFFFF",
      alignment: { horizontal: "center", vertical: "middle" },
      border: true,
    })
  })

  headerRow.height = 20
}

/**
 * Set column widths for payroll reports
 */
function setPayrollColumnWidths(worksheet: ExcelJS.Worksheet) {
  const columns = worksheet.columns
  if (!columns) return

  // Set specific widths
  columns[0].width = 5   // No.
  columns[1].width = 10  // 성명
  columns[2].width = 12  // 직종
  columns[3].width = 15  // 주민번호
  columns[4].width = 10  // 단가

  // Days 1-31: narrow columns
  for (let i = 5; i < 36; i++) {
    columns[i].width = 3
  }

  // Summary columns
  columns[36].width = 8   // 출력일수
  columns[37].width = 8   // 공수
  columns[38].width = 12  // 노무비
  columns[39].width = 10  // 갑근세
  columns[40].width = 10  // 주민세
  columns[41].width = 10  // 건강보험
  columns[42].width = 10  // 요양보험
  columns[43].width = 10  // 국민연금
  columns[44].width = 10  // 고용보험
  columns[45].width = 10  // 공제계
  columns[46].width = 12  // 차감지급액
}

// ============================================
// Export Functions
// ============================================

/**
 * 1. Generate Site-Specific Payroll Excel Report
 * 현장별 일용신고명세서
 */
export async function generateSitePayrollExcel(report: SitePayrollReport) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("현장별 일용신고명세서")

  // Header information
  createReportHeader(worksheet, {
    title: "일용노무비 지급명세서",
    companyName: report.organization_name,
    projectName: report.project_name,
    year: report.year,
    month: report.month,
  })

  // Create column headers
  createPayrollHeaders(worksheet)

  // Freeze panes at header row
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: worksheet.rowCount }]

  // Add worker entries
  let rowIndex = 1
  report.entries.forEach((entry, index) => {
    const rowData: (string | number)[] = [
      rowIndex++,
      entry.worker_name,
      entry.job_type,
      entry.ssn_masked,
      entry.daily_rate,
    ]

    // Add work days (1-31)
    for (let day = 1; day <= 31; day++) {
      const manDays = entry.work_days[day] || 0
      rowData.push(manDays > 0 ? manDays : "")
    }

    // Add summary columns
    rowData.push(
      entry.total_days,
      entry.total_man_days,
      entry.total_labor_cost,
      entry.income_tax,
      entry.resident_tax,
      entry.health_insurance,
      entry.longterm_care,
      entry.national_pension,
      entry.employment_insurance,
      entry.total_deductions,
      entry.net_pay
    )

    const row = worksheet.addRow(rowData)

    // Alternating row colors
    const bgColor = index % 2 === 0 ? "FFD6E4F0" : "FFFFFFFF"
    row.eachCell((cell) => {
      applyCellStyle(cell, {
        bgColor,
        border: true,
        alignment: { horizontal: "center", vertical: "middle" },
      })
    })

    // Apply number format to currency columns
    for (let i = 38; i <= 46; i++) {
      row.getCell(i).numFmt = "#,##0"
    }

    row.getCell(5).numFmt = "#,##0" // Daily rate
  })

  // Add totals row
  const totalsRow = worksheet.addRow([
    "",
    "합계",
    "",
    "",
    "",
    ...Array(31).fill(""),
    "",
    "",
    report.totals.total_labor_cost,
    report.totals.total_income_tax,
    report.totals.total_resident_tax,
    report.totals.total_health_insurance,
    report.totals.total_longterm_care,
    report.totals.total_national_pension,
    report.totals.total_employment_insurance,
    report.totals.total_deductions,
    report.totals.total_net_pay,
  ])

  totalsRow.eachCell((cell) => {
    applyCellStyle(cell, {
      bold: true,
      bgColor: "FFFFEB9C",
      border: true,
      alignment: { horizontal: "center", vertical: "middle" },
    })
  })

  // Apply currency format to totals
  for (let i = 38; i <= 46; i++) {
    totalsRow.getCell(i).numFmt = "#,##0"
  }

  // Set column widths
  setPayrollColumnWidths(worksheet)

  // Generate and save file
  const filename = `현장별_일용신고명세서_${report.project_name}_${report.year}-${String(report.month).padStart(2, "0")}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), filename)
}

/**
 * 2. Generate Monthly Consolidated Excel Report
 * 월별 통합본
 */
export async function generateConsolidatedExcel(
  report: MonthlyConsolidatedReport
) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("월별 통합본")

  // Header information
  createReportHeader(worksheet, {
    title: "월별 일용노무비 통합 명세서",
    companyName: report.organization_name,
    year: report.year,
    month: report.month,
    extraInfo: [
      ["구분:", "통합본"],
      ["포함 현장:", report.projects.map((p) => p.name).join(", ")],
    ],
  })

  // Create column headers
  createPayrollHeaders(worksheet)

  // Freeze panes at header row
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: worksheet.rowCount }]

  // Add worker entries
  let rowIndex = 1
  report.entries.forEach((entry, index) => {
    const rowData: (string | number)[] = [
      rowIndex++,
      entry.worker_name,
      entry.job_type,
      entry.ssn_masked,
      entry.daily_rate,
    ]

    // Add work days (1-31)
    for (let day = 1; day <= 31; day++) {
      const manDays = entry.work_days[day] || 0
      rowData.push(manDays > 0 ? manDays : "")
    }

    // Add summary columns
    rowData.push(
      entry.total_days,
      entry.total_man_days,
      entry.total_labor_cost,
      entry.income_tax,
      entry.resident_tax,
      entry.health_insurance,
      entry.longterm_care,
      entry.national_pension,
      entry.employment_insurance,
      entry.total_deductions,
      entry.net_pay
    )

    const row = worksheet.addRow(rowData)

    // Alternating row colors
    const bgColor = index % 2 === 0 ? "FFD6E4F0" : "FFFFFFFF"
    row.eachCell((cell) => {
      applyCellStyle(cell, {
        bgColor,
        border: true,
        alignment: { horizontal: "center", vertical: "middle" },
      })
    })

    // Apply number format to currency columns
    for (let i = 5; i <= 46; i++) {
      if (i >= 38) {
        row.getCell(i).numFmt = "#,##0"
      }
    }
    row.getCell(5).numFmt = "#,##0"
  })

  // Add totals row
  const totalsRow = worksheet.addRow([
    "",
    "합계",
    "",
    "",
    "",
    ...Array(31).fill(""),
    "",
    "",
    report.totals.total_labor_cost,
    report.totals.total_income_tax,
    report.totals.total_resident_tax,
    report.totals.total_health_insurance,
    report.totals.total_longterm_care,
    report.totals.total_national_pension,
    report.totals.total_employment_insurance,
    report.totals.total_deductions,
    report.totals.total_net_pay,
  ])

  totalsRow.eachCell((cell) => {
    applyCellStyle(cell, {
      bold: true,
      bgColor: "FFFFEB9C",
      border: true,
      alignment: { horizontal: "center", vertical: "middle" },
    })
  })

  for (let i = 38; i <= 46; i++) {
    totalsRow.getCell(i).numFmt = "#,##0"
  }

  // Set column widths
  setPayrollColumnWidths(worksheet)

  // Generate and save file
  const filename = `월별_통합본_${report.year}-${String(report.month).padStart(2, "0")}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), filename)
}

/**
 * 3. Generate KWDI (Korea Workers' Compensation & Welfare Service) Report Excel
 * 근로복지공단 근로내용확인신고서 전자신고용
 *
 * Column layout matches official 근로내용확인신고_전자신고용.xlsx:
 * A: 보험구분, B: 성명, C: 주민(외국인)등록번호, D: 국적코드, E: 체류자격코드,
 * F: 전화(지역번호), G: 전화(국번), H: 전화(뒷번호), I: 직종코드,
 * J~AN: 1일~31일, AO: 근로일수, AP: 일평균근로시간, AQ: 보수지급기초일수,
 * AR: 보수총액(과세소득), AS: 임금총액, AT: 이직사유코드,
 * AU: 보험료부과구분부호, AV: 보험료부과구분사유,
 * AW: 국세청일용근로소득신고여부, AX: 지급월,
 * AY: 총지급액(과세소득), AZ: 비과세소득, BA: 소득세, BB: 지방소득세
 */
export async function generateKWDIReportExcel(report: SitePayrollReport) {
  const workbook = new ExcelJS.Workbook()

  // ── Sheet: ★근로내역 (전자신고 양식) ──────────────────────────────────
  const workHistorySheet = workbook.addWorksheet("★근로내역")

  // Official header row (row 1) — matches 서식 sheet exactly
  const kwdiHeaders = [
    "보험구분",
    "성명",
    "주민(외국인)등록번호",
    "국적코드",
    "체류자격코드",
    "전화(지역번호)",
    "전화(국번)",
    "전화(뒷번호)",
    "직종코드",
    ...Array.from({ length: 31 }, (_, i) => `${i + 1}일`), // J=1일 ~ AN=31일
    "근로일수",                       // AO
    "일평균\n근로시간",               // AP
    "보수지급\n기초일수",             // AQ
    "보수총액\n(과세소득)",           // AR
    "임금총액",                       // AS
    "이직사유코드",                   // AT
    "보험료부과구분\n부호",           // AU
    "보험료부과구분\n사유",           // AV
    "국세청\n일용근로소득\n신고여부", // AW
    "지급월",                         // AX
    "총지급액\n(과세소득)",           // AY
    "비과세소득",                     // AZ
    "소득세",                         // BA
    "지방소득세",                     // BB
  ]

  const headerRow = workHistorySheet.addRow(kwdiHeaders)
  headerRow.eachCell((cell) => {
    applyCellStyle(cell, {
      bold: true,
      bgColor: "FF4472C4",
      fontColor: "FFFFFFFF",
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: true,
    })
  })
  headerRow.height = 42

  // Column widths (A~BB = 54 columns)
  workHistorySheet.getColumn(1).width = 10  // 보험구분
  workHistorySheet.getColumn(2).width = 12  // 성명
  workHistorySheet.getColumn(3).width = 18  // 주민(외국인)등록번호
  workHistorySheet.getColumn(4).width = 10  // 국적코드
  workHistorySheet.getColumn(5).width = 12  // 체류자격코드
  workHistorySheet.getColumn(6).width = 10  // 전화(지역번호)
  workHistorySheet.getColumn(7).width = 10  // 전화(국번)
  workHistorySheet.getColumn(8).width = 10  // 전화(뒷번호)
  workHistorySheet.getColumn(9).width = 10  // 직종코드
  // Days 1-31 (columns 10~40 = J~AN)
  for (let c = 10; c <= 40; c++) {
    workHistorySheet.getColumn(c).width = 4
  }
  workHistorySheet.getColumn(41).width = 10 // 근로일수 (AO)
  workHistorySheet.getColumn(42).width = 12 // 일평균근로시간 (AP)
  workHistorySheet.getColumn(43).width = 12 // 보수지급기초일수 (AQ)
  workHistorySheet.getColumn(44).width = 14 // 보수총액 (AR)
  workHistorySheet.getColumn(45).width = 14 // 임금총액 (AS)
  workHistorySheet.getColumn(46).width = 12 // 이직사유코드 (AT)
  workHistorySheet.getColumn(47).width = 14 // 보험료부과구분부호 (AU)
  workHistorySheet.getColumn(48).width = 14 // 보험료부과구분사유 (AV)
  workHistorySheet.getColumn(49).width = 14 // 국세청신고여부 (AW)
  workHistorySheet.getColumn(50).width = 10 // 지급월 (AX)
  workHistorySheet.getColumn(51).width = 14 // 총지급액 (AY)
  workHistorySheet.getColumn(52).width = 12 // 비과세소득 (AZ)
  workHistorySheet.getColumn(53).width = 12 // 소득세 (BA)
  workHistorySheet.getColumn(54).width = 12 // 지방소득세 (BB)

  // Payment month string (YYYYMM)
  const payMonth = `${report.year}${String(report.month).padStart(2, "0")}`

  // Add worker data rows (from row 2 onward, data-only, no extra headers)
  report.entries.forEach((entry, index) => {
    // Split phone number into area code / middle / last
    let phoneArea = ""
    let phoneMid = ""
    let phoneLast = ""
    if (entry.phone) {
      // Support formats: 010-1234-5678 or 0212345678
      const cleaned = entry.phone.replace(/[^0-9]/g, "")
      if (cleaned.startsWith("010") || cleaned.startsWith("011") || cleaned.startsWith("016") || cleaned.startsWith("017") || cleaned.startsWith("018") || cleaned.startsWith("019")) {
        phoneArea = cleaned.slice(0, 3)
        phoneMid = cleaned.slice(3, 7)
        phoneLast = cleaned.slice(7)
      } else if (cleaned.startsWith("02")) {
        phoneArea = "02"
        phoneMid = cleaned.slice(2, 6)
        phoneLast = cleaned.slice(6)
      } else {
        phoneArea = cleaned.slice(0, 3)
        phoneMid = cleaned.slice(3, 7)
        phoneLast = cleaned.slice(7)
      }
    }

    // Determine insurance type (default: 5=산재+고용)
    const insuranceType = entry.insurance_type ?? "5"

    // Nationality code: blank/100 for Korean, actual code for foreigners
    const nationalityCode = entry.is_foreign ? (entry.nationality_code ?? "") : "100"

    // Visa code: blank for Koreans
    const visaCode = entry.is_foreign ? (entry.visa_status ?? "") : ""

    // Job type code (직종코드)
    const jobCode = entry.job_type_code ?? "706" // 기본: 건설·채국 단순 종사자

    // SSN: use full SSN for electronic filing if available, otherwise masked
    const ssn = (entry.ssn_full ?? entry.ssn_masked).replace(/-/g, "")

    const rowData: (string | number)[] = [
      insuranceType,   // A: 보험구분
      entry.worker_name, // B: 성명
      ssn,             // C: 주민(외국인)등록번호 (하이픈 제외 13자리)
      nationalityCode, // D: 국적코드
      visaCode,        // E: 체류자격코드
      phoneArea,       // F: 전화(지역번호)
      phoneMid,        // G: 전화(국번)
      phoneLast,       // H: 전화(뒷번호)
      jobCode,         // I: 직종코드
    ]

    // J~AN: 1일~31일 (0 for non-working days as required by KWDI format)
    for (let day = 1; day <= 31; day++) {
      const manDays = entry.work_days[day] || 0
      rowData.push(manDays > 0 ? manDays : 0)
    }

    // AO: 근로일수
    rowData.push(entry.total_days)
    // AP: 일평균근로시간 (default 8시간)
    rowData.push(8)
    // AQ: 보수지급기초일수 (= 근로일수)
    rowData.push(entry.total_days)
    // AR: 보수총액(과세소득) = total_labor_cost
    rowData.push(entry.total_labor_cost)
    // AS: 임금총액 = total_labor_cost (과세+비과세; 비과세 없으면 동일)
    rowData.push(entry.total_labor_cost + (entry.nontaxable_income ?? 0))
    // AT: 이직사유코드 (1=회사 사정)
    rowData.push("1")
    // AU: 보험료부과구분부호 (blank if normal)
    rowData.push("")
    // AV: 보험료부과구분사유 (blank if normal)
    rowData.push("")
    // AW: 국세청 일용근로소득 신고여부 (Y/blank)
    rowData.push(entry.income_tax > 0 ? "Y" : "")
    // AX: 지급월 (YYYYMM)
    rowData.push(entry.nts_pay_month ?? payMonth)
    // AY: 총지급액(과세소득)
    rowData.push(entry.total_labor_cost)
    // AZ: 비과세소득
    rowData.push(entry.nontaxable_income ?? 0)
    // BA: 소득세
    rowData.push(entry.income_tax)
    // BB: 지방소득세
    rowData.push(entry.resident_tax)

    const row = workHistorySheet.addRow(rowData)

    const bgColor = index % 2 === 0 ? "FFD6E4F0" : "FFFFFFFF"
    row.eachCell((cell, colNumber) => {
      applyCellStyle(cell, {
        bgColor,
        border: true,
        alignment: { horizontal: "center", vertical: "middle" },
      })
      // Apply number format to monetary columns
      // AR(44), AS(45), AY(51), AZ(52), BA(53), BB(54)
      if ([44, 45, 51, 52, 53, 54].includes(colNumber)) {
        cell.numFmt = "#,##0"
      }
    })
  })

  workHistorySheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }]

  // ── Sheet: 작성방법 (reference guide) ────────────────────────────────
  const guideSheet = workbook.addWorksheet("작성방법")
  guideSheet.addRow(["<작성법> 근로내용확인신고서"])
  guideSheet.addRow([])
  const guideData = [
    [1, "보험구분", "고용보험, 산재보험 구분\n- 1: 산재보험\n- 3: 고용보험\n- 5: 산재,고용보험"],
    [2, "성명", "주민등록표(외국인등록증 또는 국내거소신고증)상의 성명을 적습니다."],
    [3, "주민(외국인)등록번호", "13자리 숫자만 적습니다. (\"-\" 제외)"],
    [4, "국적코드", "근로자의 국적코드 (국적코드표 참조). 내국인: 100"],
    [5, "체류자격코드", "외국인의 체류자격코드 (예: H-2, E-9). 내국인은 공란."],
    [6, "전화(지역번호)", "지역번호 (휴대폰의 경우 01x)"],
    [7, "전화(국번)", "국번"],
    [8, "전화(뒷번호)", "전화번호 뒷자리"],
    [9, "직종코드", "근로복지공단 직종코드. 건설단순: 706, 건설기능원: 701"],
    [10, "1일~31일", "해당 일에 근로한 경우 공수(0.5 또는 1) 입력, 미근로시 0"],
    [11, "근로일수", "실제 근로한 일수 합계"],
    [12, "일평균근로시간", "일평균 근로시간 (통상 8시간)"],
    [13, "보수지급기초일수", "보수 지급 기초가 되는 일수 (= 근로일수)"],
    [14, "보수총액(과세소득)", "과세 대상 보수 총액"],
    [15, "임금총액", "과세 + 비과세 포함 전체 임금총액"],
    [16, "이직사유코드", "1: 회사 사정(폐업·공사중단·계약만료 등)"],
    [19, "국세청 일용근로소득 신고여부", "국세청에 신고한 경우 Y, 미신고시 공란"],
    [20, "지급월", "임금을 지급한 월 (YYYYMM 형식, 예: 202601)"],
    [21, "총지급액(과세소득)", "국세청 신고 대상 총지급액"],
    [22, "비과세소득", "비과세 소득 (없는 경우 0 또는 공란)"],
    [23, "소득세", "원천징수한 소득세"],
    [24, "지방소득세", "소득세의 10%"],
  ]
  guideData.forEach(([no, field, desc]) => {
    guideSheet.addRow([no, field, desc])
  })
  guideSheet.getColumn(1).width = 5
  guideSheet.getColumn(2).width = 22
  guideSheet.getColumn(3).width = 60

  // ── Sheet: 국적코드 ───────────────────────────────────────────────────
  const codeSheet = workbook.addWorksheet("국적코드")
  codeSheet.addRow(["국적코드", "국가명"])
  Object.entries(KWDI_NATIONALITY_CODES).forEach(([code, name]) => {
    codeSheet.addRow([code, name])
  })
  codeSheet.addRow([])
  codeSheet.addRow(["※ 전체 코드: http://www.4insure.or.kr/pbiz/cmmn/selectComCdList.do?comCdClsfId=A151"])
  codeSheet.addRow([])
  codeSheet.addRow(["직종코드", "직종명"])
  Object.entries(KWDI_JOB_CODES).forEach(([code, name]) => {
    codeSheet.addRow([code, name])
  })
  codeSheet.addRow(["※ 전체 코드: http://www.4insure.or.kr/pbiz/cmmn/selectComCdList.do?comCdClsfId=D108"])
  codeSheet.getColumn(1).width = 15
  codeSheet.getColumn(2).width = 40

  // Generate and save file
  const filename = `근로복지공단_근로내용확인신고_${report.project_name}_${report.year}${String(report.month).padStart(2, "0")}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), filename)
}

/**
 * 4. Generate National Tax Service (국세청) Daily Labor Income Report Excel
 * 일용근로지급명세서 일괄등록 양식 — 국세청 양식
 *
 * Column layout matches official 국세청 양식.xlsx Sheet1:
 * A: 일련번호, B: 성명, C: 내외국인(1=내국인/9=외국인), D: 주민등록번호,
 * E: 전화번호, F: 지급월(MM), G: 근무월(MM), H: 근무일수, I: 최종근무일,
 * J: 과세소득, K: 비과세소득, L: 소득세, M: 지방소득세
 *
 * Notes:
 * - Sheet must be named 'Sheet1' (국세청 시스템 요구사항)
 * - Data starts from row 2 (row 1 = header)
 * - Maximum 1,000 data rows per file
 * - 지급월/근무월: "01"~"12" (두 자리 문자열)
 */
export async function generateNationalTaxExcel(report: SitePayrollReport) {
  const workbook = new ExcelJS.Workbook()
  // Sheet name MUST be 'Sheet1' per NTS system requirements
  const worksheet = workbook.addWorksheet("Sheet1")

  // Official header row (row 1)
  const ntsHeaders = [
    "일련번호\n1부터 순차로 기재", // A
    "성명",                          // B
    "내외국인\n'1' 또는 '9' 기재",  // C
    "주민등록번호",                  // D
    "전화번호",                      // E
    "지급월\n예시) 1월인 경우  '01' ", // F
    "근무월\n예시) 1월인 경우  '01' ", // G
    "근무일수",                      // H
    "최종근무일",                    // I
    "과세소득",                      // J
    "비과세소득",                    // K
    "소득세",                        // L
    "지방소득세",                    // M
  ]

  const headerRow = worksheet.addRow(ntsHeaders)
  headerRow.eachCell((cell) => {
    applyCellStyle(cell, {
      bold: true,
      bgColor: "FF4472C4",
      fontColor: "FFFFFFFF",
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: true,
    })
  })
  headerRow.height = 42

  // Column widths
  worksheet.columns = [
    { width: 14 }, // A: 일련번호
    { width: 12 }, // B: 성명
    { width: 12 }, // C: 내외국인
    { width: 16 }, // D: 주민등록번호
    { width: 14 }, // E: 전화번호
    { width: 12 }, // F: 지급월
    { width: 12 }, // G: 근무월
    { width: 10 }, // H: 근무일수
    { width: 12 }, // I: 최종근무일
    { width: 14 }, // J: 과세소득
    { width: 12 }, // K: 비과세소득
    { width: 12 }, // L: 소득세
    { width: 12 }, // M: 지방소득세
  ]

  // Month strings (2-digit, e.g. "01")
  const monthStr = String(report.month).padStart(2, "0")

  // Add worker data (from row 2)
  report.entries.forEach((entry, index) => {
    // 내외국인 구분: 1=내국인, 9=외국인
    const nationalCode = entry.is_foreign ? "9" : "1"

    // SSN format for NTS: hyphened 000000-0000000 or raw 13 digits
    const ssn = entry.ssn_full ?? entry.ssn_masked

    // Determine last work date of the month for this worker
    let lastWorkDay = 0
    for (let day = 31; day >= 1; day--) {
      if ((entry.work_days[day] ?? 0) > 0) {
        lastWorkDay = day
        break
      }
    }
    const lastWorkDateStr = lastWorkDay > 0
      ? `${report.year}${monthStr}${String(lastWorkDay).padStart(2, "0")}`
      : ""

    const row = worksheet.addRow([
      index + 1,                          // A: 일련번호
      entry.worker_name,                  // B: 성명
      nationalCode,                       // C: 내외국인
      ssn,                                // D: 주민등록번호
      entry.phone ?? "",                  // E: 전화번호
      monthStr,                           // F: 지급월 (MM)
      entry.nts_work_month
        ? entry.nts_work_month.slice(-2)
        : monthStr,                       // G: 근무월 (MM)
      entry.total_days,                   // H: 근무일수
      lastWorkDateStr,                    // I: 최종근무일 (YYYYMMDD)
      entry.total_labor_cost,             // J: 과세소득
      entry.nontaxable_income ?? 0,       // K: 비과세소득
      entry.income_tax,                   // L: 소득세
      entry.resident_tax,                 // M: 지방소득세
    ])

    const bgColor = index % 2 === 0 ? "FFD6E4F0" : "FFFFFFFF"
    row.eachCell((cell, colNumber) => {
      applyCellStyle(cell, {
        bgColor,
        border: true,
        alignment: { horizontal: "center", vertical: "middle" },
      })
      // Number format for monetary columns (J=10, K=11, L=12, M=13)
      if (colNumber >= 10) {
        cell.numFmt = "#,##0"
      }
    })
  })

  // Add totals row (reference only, NTS system ignores rows after last data)
  const totalsRow = worksheet.addRow([
    "합계",
    "",
    "",
    "",
    "",
    "",
    "",
    report.entries.reduce((s, e) => s + e.total_days, 0),
    "",
    report.totals.total_labor_cost,
    report.entries.reduce((s, e) => s + (e.nontaxable_income ?? 0), 0),
    report.totals.total_income_tax,
    report.totals.total_resident_tax,
  ])

  totalsRow.eachCell((cell, colNumber) => {
    applyCellStyle(cell, {
      bold: true,
      bgColor: "FFFFEB9C",
      border: true,
      alignment: { horizontal: "center", vertical: "middle" },
    })
    if (colNumber >= 10) {
      cell.numFmt = "#,##0"
    }
  })

  // Add data validation for 내외국인 column (C) and 지급월/근무월 (F, G)
  // per NTS official template — ExcelJS sets validation per cell
  const dvNational: ExcelJS.DataValidation = {
    type: "list",
    allowBlank: false,
    formulae: ['"1,9"'],
    showErrorMessage: true,
    errorTitle: "입력 오류",
    error: "내국인: 1, 외국인: 9",
    operator: "equal",
  }
  const dvMonth: ExcelJS.DataValidation = {
    type: "list",
    allowBlank: false,
    formulae: ['"01,02,03,04,05,06,07,08,09,10,11,12"'],
    showErrorMessage: true,
    errorTitle: "입력 오류",
    error: "01~12 사이의 값을 입력하세요.",
    operator: "equal",
  }
  // Apply validation to rows 2..1001
  for (let r = 2; r <= Math.min(report.entries.length + 1, 1001); r++) {
    worksheet.getCell(r, 3).dataValidation = dvNational  // C
    worksheet.getCell(r, 6).dataValidation = dvMonth     // F
    worksheet.getCell(r, 7).dataValidation = dvMonth     // G
  }

  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }]

  // Generate and save file
  const filename = `국세청_일용근로소득_${report.project_name}_${report.year}${String(report.month).padStart(2, "0")}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), filename)
}
