// 기본 체험 기간 (일 단위) - 변경 용이하도록 상수로 분리
export const DEFAULT_TRIAL_DAYS = 30;

export interface SignupData {
  // Step 1: Basic Info
  username: string;
  usernameChecked: boolean;
  usernameAvailable: boolean;
  email: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  phoneVerified: boolean;
  phoneOtpRequestId: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed: boolean;

  // Step 2: Business
  businessNumber: string;
  businessVerified: boolean;
  companyName: string;
  representativeName: string;
  businessLicenseFile?: File;
  constructionLicenseFile?: File;
  womanOwnedCertFile?: File;
  // Representative info (대표자)
  repPhone: string;
  repEmail: string;
  // Worker contact info (실무자, optional)
  contactName: string;
  contactPhone: string;
  contactPosition: string;

  // Step 3: Plan (연간 결제만 지원)
  planType: "trial" | "basic" | "pro";

  // Step 4: Payment
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;

  // Post-payment
  accessToken?: string;
  paymentCompleted?: boolean;
}

export const STEPS = [
  { label: "기본 정보", description: "아이디 및 인증" },
  { label: "사업자 인증", description: "사업자등록증" },
  { label: "요금제 선택", description: "플랜 선택" },
  { label: "결제", description: "결제 정보 입력" },
];

export const PLANS = [
  {
    id: "trial" as const,
    name: "무료 체험",
    description: `${DEFAULT_TRIAL_DAYS}일 무료로 모든 기능을 사용해보세요`,
    price: 0, // 연간 가격 (무료)
    features: [
      "사용자 2명 (대표 + 소장)",
      "프로젝트 무제한",
      "AI 진단 무제한",
      "모든 기능 이용",
    ],
  },
  {
    id: "basic" as const,
    name: "Basic",
    description: "소규모 건설사를 위한 필수 기능",
    price: 588000, // 49,000 × 12 (연간)
    features: [
      "사용자 5명",
      "프로젝트 무제한",
      "AI 진단 무제한",
      "이메일 지원",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    description: "중대형 건설사를 위한 고급 기능",
    price: 1188000, // 99,000 × 12 (연간)
    features: [
      "사용자 무제한",
      "프로젝트 무제한",
      "AI 진단 무제한",
      "우선 지원",
      "API 연동",
    ],
  },
];

export function getInitialSignupData(): SignupData {
  return {
    username: "",
    usernameChecked: false,
    usernameAvailable: false,
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    phoneVerified: false,
    phoneOtpRequestId: "",
    termsAgreed: false,
    privacyAgreed: false,
    marketingAgreed: false,
    businessNumber: "",
    businessVerified: false,
    companyName: "",
    representativeName: "",
    repPhone: "",
    repEmail: "",
    contactName: "",
    contactPhone: "",
    contactPosition: "",
    planType: "trial",
  };
}

export function saveSignupData(data: Partial<SignupData>) {
  if (typeof window !== "undefined") {
    const existing = getSignupData();
    sessionStorage.setItem("signup_data", JSON.stringify({ ...existing, ...data }));
  }
}

export function getSignupData(): SignupData {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("signup_data");
    if (stored) {
      try {
        return { ...getInitialSignupData(), ...JSON.parse(stored) };
      } catch {
        return getInitialSignupData();
      }
    }
  }
  return getInitialSignupData();
}

export function clearSignupData() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("signup_data");
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUsername(username: string): boolean {
  // 4-20자, 영문으로 시작, 영문/숫자/밑줄만 허용
  return /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/.test(username);
}

export function validatePassword(password: string): boolean {
  // At least 8 characters, contains letter, number, and special character
  return (
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}

export function validatePhone(phone: string): boolean {
  // Korean phone number format: 010-0000-0000
  return /^010-\d{4}-\d{4}$/.test(phone);
}

export function validateBusinessNumber(number: string): boolean {
  // Korean business number format: 000-00-00000
  return /^\d{3}-\d{2}-\d{5}$/.test(number);
}

export function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\s/g, "");
  const chunks = cleaned.match(/.{1,4}/g);
  return chunks ? chunks.join(" ") : cleaned;
}

export function formatCardExpiry(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
  }
  return cleaned;
}
