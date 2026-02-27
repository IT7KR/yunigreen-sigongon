/**
 * Aligo API Client (Mock Implementation)
 *
 * 알리고 알림톡/SMS API 클라이언트
 * 실제 API 연동 전 Mock 구현으로 UI 개발 지원
 *
 * @see https://smartsms.aligo.in/admin/api/kakao.html
 */

// ============================================
// Types
// ============================================

export type AlimTalkTemplateCode =
  | "WORKER_INVITE"       // 근로자 가입 초대
  | "WORKER_REGISTERED"   // 근로자 가입 완료
  | "USER_INVITE"         // 사용자 초대 (실무자/현장소장)
  | "CONTRACT_SIGN"       // 계약서 서명 요청
  | "PAYSTUB_SENT"        // 급여명세서 발송

export interface AlimTalkSendRequest {
  /** 수신자 전화번호 (하이픈 포함/미포함 모두 가능) */
  phone: string
  /** 템플릿 코드 */
  template_code: AlimTalkTemplateCode
  /** 템플릿 변수 */
  variables: Record<string, string>
  /** 알림톡 실패 시 SMS 대체발송 여부 */
  fallback_sms?: boolean
}

export interface AlimTalkSendResponse {
  success: boolean
  message_id?: string
  error_code?: string
  error_message?: string
}

export interface AlimTalkStatusRequest {
  message_id: string
}

export interface AlimTalkStatusResponse {
  success: boolean
  status: "pending" | "sent" | "delivered" | "failed" | "read"
  sent_at?: string
  delivered_at?: string
  read_at?: string
  error_message?: string
}

// ============================================
// Template Definitions
// ============================================

interface TemplateDefinition {
  code: AlimTalkTemplateCode
  name: string
  content: string
  buttons?: Array<{
    type: "WL" | "AL"  // Web Link, App Link
    name: string
    url_mobile?: string
    url_pc?: string
  }>
}

const TEMPLATES: Record<AlimTalkTemplateCode, TemplateDefinition> = {
  WORKER_INVITE: {
    code: "WORKER_INVITE",
    name: "근로자 가입 초대",
    content: `[시공ON] #{name}님, 안녕하세요.
#{company_name}에서 일용근로자 등록을 요청했습니다.

아래 링크를 통해 가입을 완료해주세요.
- 개인정보처리방침 동의
- 신분증 사본 업로드
- 기초안전교육 이수증 업로드

가입 완료 후 근무 배정 및 급여 지급이 가능합니다.`,
    buttons: [
      {
        type: "WL",
        name: "가입하기",
        url_mobile: "#{invite_url}",
        url_pc: "#{invite_url}",
      },
    ],
  },

  WORKER_REGISTERED: {
    code: "WORKER_REGISTERED",
    name: "근로자 가입 완료",
    content: `[시공ON] #{name}님, 가입이 완료되었습니다.

이제 #{company_name}의 현장에서 근무하실 수 있습니다.
근무 배정 및 급여 내역은 앱에서 확인하세요.`,
    buttons: [
      {
        type: "AL",
        name: "앱 열기",
      },
    ],
  },

  USER_INVITE: {
    code: "USER_INVITE",
    name: "사용자 초대",
    content: `[시공ON] #{name}님, 안녕하세요.
#{inviter_name}님이 시공ON 사용을 초대했습니다.

역할: #{role_name}
#{company_name ? '회사: ' + company_name : ''}

아래 링크에서 가입을 완료해주세요.`,
    buttons: [
      {
        type: "WL",
        name: "가입하기",
        url_mobile: "#{invite_url}",
        url_pc: "#{invite_url}",
      },
    ],
  },

  CONTRACT_SIGN: {
    code: "CONTRACT_SIGN",
    name: "계약서 서명 요청",
    content: `[시공ON] #{name}님, 근로계약서 서명을 요청합니다.

현장명: #{project_name}
근무일: #{work_date}
일당: #{daily_rate}원

아래 링크에서 계약 내용 확인 후 서명해주세요.`,
    buttons: [
      {
        type: "WL",
        name: "서명하기",
        url_mobile: "#{sign_url}",
        url_pc: "#{sign_url}",
      },
    ],
  },

  PAYSTUB_SENT: {
    code: "PAYSTUB_SENT",
    name: "급여명세서 발송",
    content: `[시공ON] #{name}님, #{year}년 #{month}월 급여명세서입니다.

총 노무비: #{total_labor}원
공제 합계: #{total_deduction}원
실수령액: #{net_pay}원

상세 내역은 앱에서 확인하세요.`,
    buttons: [
      {
        type: "AL",
        name: "상세 보기",
      },
    ],
  },
}

// ============================================
// Mock Implementation
// ============================================

let mockMessageCounter = 1000

/**
 * 알림톡 발송
 */
export async function sendAlimTalk(request: AlimTalkSendRequest): Promise<AlimTalkSendResponse> {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true"

  if (!useMocks) {
    // Real API call
    try {
      const { api } = await import("@/lib/api")
      const result = await api.sendAlimTalk({
        phone: request.phone.replace(/-/g, ""),
        template_code: request.template_code,
        variables: request.variables,
      })
      if (result.success && result.data) {
        return { success: true, message_id: result.data.message_id }
      }
      const errMsg = (result as unknown as { error?: { message?: string } }).error?.message || "발송 실패"
      return { success: false, error_message: errMsg }
    } catch (e) {
      console.error("[Aligo] API call failed:", e)
      return { success: false, error_message: String(e) }
    }
  }

  // Mock implementation
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 200))

  // Validate phone number
  const cleanPhone = request.phone.replace(/-/g, "")
  if (!/^01[0-9]{8,9}$/.test(cleanPhone)) {
    return {
      success: false,
      error_code: "INVALID_PHONE",
      error_message: "유효하지 않은 전화번호입니다",
    }
  }

  // Validate template
  const template = TEMPLATES[request.template_code]
  if (!template) {
    return {
      success: false,
      error_code: "INVALID_TEMPLATE",
      error_message: "존재하지 않는 템플릿입니다",
    }
  }

  // Generate message ID
  const messageId = `ALT${Date.now()}${++mockMessageCounter}`

  // Store in mock storage for status lookup
  if (typeof window !== "undefined") {
    const storage = window.sessionStorage
    const messages = JSON.parse(storage.getItem("aligo_messages") || "{}")
    messages[messageId] = {
      phone: cleanPhone,
      template_code: request.template_code,
      variables: request.variables,
      status: "sent",
      sent_at: new Date().toISOString(),
    }
    storage.setItem("aligo_messages", JSON.stringify(messages))
  }

  console.log("[Aligo Mock] AlimTalk sent:", {
    messageId,
    phone: cleanPhone,
    template: template.name,
    variables: request.variables,
  })

  return {
    success: true,
    message_id: messageId,
  }
}

/**
 * 알림톡 발송 상태 조회
 */
export async function getAlimTalkStatus(request: AlimTalkStatusRequest): Promise<AlimTalkStatusResponse> {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true"

  if (!useMocks) {
    // Real API call
    try {
      const { api } = await import("@/lib/api")
      const result = await api.getAlimTalkStatus(request.message_id)
      if (result.success && result.data) {
        return {
          success: true,
          status: result.data.status as AlimTalkStatusResponse["status"],
        }
      }
      const errMsg2 = (result as unknown as { error?: { message?: string } }).error?.message || "조회 실패"
      return { success: false, status: "failed", error_message: errMsg2 }
    } catch (e) {
      console.error("[Aligo] Status API call failed:", e)
      return { success: false, status: "failed", error_message: String(e) }
    }
  }

  // Mock implementation
  await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 100))

  if (typeof window === "undefined") {
    return {
      success: true,
      status: "delivered",
    }
  }

  const storage = window.sessionStorage
  const messages = JSON.parse(storage.getItem("aligo_messages") || "{}")
  const message = messages[request.message_id]

  if (!message) {
    return {
      success: false,
      status: "failed",
      error_message: "메시지를 찾을 수 없습니다",
    }
  }

  // Simulate status progression
  const sentTime = new Date(message.sent_at).getTime()
  const elapsed = Date.now() - sentTime

  let status: AlimTalkStatusResponse["status"] = "sent"
  let delivered_at: string | undefined
  let read_at: string | undefined

  if (elapsed > 10000) {
    status = "read"
    delivered_at = new Date(sentTime + 2000).toISOString()
    read_at = new Date(sentTime + 8000).toISOString()
  } else if (elapsed > 3000) {
    status = "delivered"
    delivered_at = new Date(sentTime + 2000).toISOString()
  }

  return {
    success: true,
    status,
    sent_at: message.sent_at,
    delivered_at,
    read_at,
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * 근로자 초대 알림톡 발송
 */
export async function sendWorkerInvite(params: {
  phone: string
  name: string
  companyName: string
  inviteUrl: string
}): Promise<AlimTalkSendResponse> {
  return sendAlimTalk({
    phone: params.phone,
    template_code: "WORKER_INVITE",
    variables: {
      name: params.name,
      company_name: params.companyName,
      invite_url: params.inviteUrl,
    },
    fallback_sms: true,
  })
}

/**
 * 사용자 초대 알림톡 발송
 */
export async function sendUserInvite(params: {
  phone: string
  name: string
  inviterName: string
  roleName: string
  companyName?: string
  inviteUrl: string
}): Promise<AlimTalkSendResponse> {
  return sendAlimTalk({
    phone: params.phone,
    template_code: "USER_INVITE",
    variables: {
      name: params.name,
      inviter_name: params.inviterName,
      role_name: params.roleName,
      company_name: params.companyName || "",
      invite_url: params.inviteUrl,
    },
    fallback_sms: true,
  })
}

/**
 * 근로계약서 서명 요청 알림톡 발송
 */
export async function sendContractSignRequest(params: {
  phone: string
  name: string
  projectName: string
  workDate: string
  dailyRate: number
  signUrl: string
}): Promise<AlimTalkSendResponse> {
  return sendAlimTalk({
    phone: params.phone,
    template_code: "CONTRACT_SIGN",
    variables: {
      name: params.name,
      project_name: params.projectName,
      work_date: params.workDate,
      daily_rate: params.dailyRate.toLocaleString(),
      sign_url: params.signUrl,
    },
    fallback_sms: true,
  })
}

/**
 * 급여명세서 발송 알림톡 발송
 */
export async function sendPaystubNotification(params: {
  phone: string
  name: string
  year: number
  month: number
  totalLabor: number
  totalDeduction: number
  netPay: number
}): Promise<AlimTalkSendResponse> {
  return sendAlimTalk({
    phone: params.phone,
    template_code: "PAYSTUB_SENT",
    variables: {
      name: params.name,
      year: params.year.toString(),
      month: params.month.toString(),
      total_labor: params.totalLabor.toLocaleString(),
      total_deduction: params.totalDeduction.toLocaleString(),
      net_pay: params.netPay.toLocaleString(),
    },
    fallback_sms: false,
  })
}
