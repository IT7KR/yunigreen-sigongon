/**
 * Excel Export Module for Korean Daily Labor Payroll Reporting
 *
 * Provides functions to generate Excel reports for labor management:
 * - Site-specific payroll reports (현장별 일용신고명세서)
 * - Monthly consolidated reports (월별 통합본)
 * - KWDI insurance reports (근로복지공단 신고 양식)
 * - National tax reports (국세청 신고 양식)
 */

import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import type {
  SitePayrollReport,
  MonthlyConsolidatedReport,
} from "@sigongon/types"

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
  }
) {
  if (options.bold) {
    cell.font = { ...cell.font, bold: true }
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
 * 근로복지공단 신고 양식
 */
export async function generateKWDIReportExcel(report: SitePayrollReport) {
  const workbook = new ExcelJS.Workbook()

  // Sheet 1: Insurance Report (★보험)
  const insuranceSheet = workbook.addWorksheet("★보험")

  createReportHeader(insuranceSheet, {
    title: "근로복지공단 일용근로자 신고서",
    companyName: report.organization_name,
    projectName: report.project_name,
    year: report.year,
    month: report.month,
  })

  // Header row
  const insuranceHeaders = [
    "이름",
    "주민번호",
    "취득일",
    "상실일",
    "근무일수",
    "보수월액",
    "고용보험료",
    "건강보험료",
    "국민연금",
  ]

  const insuranceHeaderRow = insuranceSheet.addRow(insuranceHeaders)
  insuranceHeaderRow.eachCell((cell) => {
    applyCellStyle(cell, {
      bold: true,
      bgColor: "FF4472C4",
      fontColor: "FFFFFFFF",
      alignment: { horizontal: "center", vertical: "middle" },
      border: true,
    })
  })

  // Set column widths
  insuranceSheet.columns = [
    { width: 12 }, // 이름
    { width: 15 }, // 주민번호
    { width: 12 }, // 취득일
    { width: 12 }, // 상실일
    { width: 10 }, // 근무일수
    { width: 12 }, // 보수월액
    { width: 12 }, // 고용보험료
    { width: 12 }, // 건강보험료
    { width: 12 }, // 국민연금
  ]

  // Add worker data
  report.entries.forEach((entry, index) => {
    const row = insuranceSheet.addRow([
      entry.worker_name,
      entry.ssn_masked,
      "", // 취득일 (to be filled manually)
      "", // 상실일 (to be filled manually)
      entry.total_days,
      entry.total_labor_cost,
      entry.employment_insurance,
      entry.health_insurance,
      entry.national_pension,
    ])

    const bgColor = index % 2 === 0 ? "FFD6E4F0" : "FFFFFFFF"
    row.eachCell((cell, colNumber) => {
      applyCellStyle(cell, {
        bgColor,
        border: true,
        alignment: { horizontal: "center", vertical: "middle" },
      })

      // Apply number format to currency columns
      if (colNumber >= 5) {
        cell.numFmt = "#,##0"
      }
    })
  })

  insuranceSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }]

  // Sheet 2: Work History (★근로내역)
  const workHistorySheet = workbook.addWorksheet("★근로내역")

  createReportHeader(workHistorySheet, {
    title: "근로내역 신고서",
    companyName: report.organization_name,
    projectName: report.project_name,
    year: report.year,
    month: report.month,
  })

  // Header row
  const workHistoryHeaders = [
    "이름",
    "주민번호",
    ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
  ]

  const workHistoryHeaderRow = workHistorySheet.addRow(workHistoryHeaders)
  workHistoryHeaderRow.eachCell((cell) => {
    applyCellStyle(cell, {
      bold: true,
      bgColor: "FF4472C4",
      fontColor: "FFFFFFFF",
      alignment: { horizontal: "center", vertical: "middle" },
      border: true,
    })
  })

  // Set column widths
  workHistorySheet.getColumn(1).width = 12 // 이름
  workHistorySheet.getColumn(2).width = 15 // 주민번호
  for (let i = 3; i <= 33; i++) {
    workHistorySheet.getColumn(i).width = 3
  }

  // Add worker data
  report.entries.forEach((entry, index) => {
    const rowData: (string | number)[] = [
      entry.worker_name,
      entry.ssn_masked,
    ]

    // Add work days (1-31)
    for (let day = 1; day <= 31; day++) {
      const manDays = entry.work_days[day] || 0
      rowData.push(manDays > 0 ? manDays : "")
    }

    const row = workHistorySheet.addRow(rowData)

    const bgColor = index % 2 === 0 ? "FFD6E4F0" : "FFFFFFFF"
    row.eachCell((cell) => {
      applyCellStyle(cell, {
        bgColor,
        border: true,
        alignment: { horizontal: "center", vertical: "middle" },
      })
    })
  })

  workHistorySheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }]

  // Generate and save file
  const filename = `근로복지공단_신고양식_${report.project_name}_${report.year}-${String(report.month).padStart(2, "0")}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), filename)
}

/**
 * 4. Generate National Tax Service Report Excel
 * 국세청 신고 양식 (★국세)
 */
export async function generateNationalTaxExcel(report: SitePayrollReport) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("★국세")

  createReportHeader(worksheet, {
    title: "국세청 일용근로소득 신고서",
    companyName: report.organization_name,
    projectName: report.project_name,
    year: report.year,
    month: report.month,
  })

  // Header row
  const headers = ["이름", "주민번호", "지급총액", "소득세", "지방소득세"]

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

  // Set column widths
  worksheet.columns = [
    { width: 12 }, // 이름
    { width: 15 }, // 주민번호
    { width: 15 }, // 지급총액
    { width: 12 }, // 소득세
    { width: 12 }, // 지방소득세
  ]

  // Add worker data
  report.entries.forEach((entry, index) => {
    const row = worksheet.addRow([
      entry.worker_name,
      entry.ssn_masked,
      entry.total_labor_cost,
      entry.income_tax,
      entry.resident_tax,
    ])

    const bgColor = index % 2 === 0 ? "FFD6E4F0" : "FFFFFFFF"
    row.eachCell((cell, colNumber) => {
      applyCellStyle(cell, {
        bgColor,
        border: true,
        alignment: { horizontal: "center", vertical: "middle" },
      })

      // Apply number format to currency columns
      if (colNumber >= 3) {
        cell.numFmt = "#,##0"
      }
    })
  })

  // Add totals row
  const totalsRow = worksheet.addRow([
    "합계",
    "",
    report.totals.total_labor_cost,
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

    if (colNumber >= 3) {
      cell.numFmt = "#,##0"
    }
  })

  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }]

  // Generate and save file
  const filename = `국세청_신고양식_${report.project_name}_${report.year}-${String(report.month).padStart(2, "0")}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), filename)
}
