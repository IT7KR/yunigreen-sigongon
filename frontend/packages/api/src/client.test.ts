/**
 * APIClient.getFileUrl 단위 테스트
 *
 * 스토리지 경로 → 완전한 URL 변환 로직을 검증합니다.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { APIClient } from "./client";

describe("APIClient.getFileUrl", () => {
  let client: APIClient;

  beforeEach(() => {
    client = new APIClient({ baseURL: "http://api.example.com" });
  });

  // ── 빈값 처리 ───────────────────────────────────────────────────

  it("빈 문자열 입력 시 빈 문자열 반환", () => {
    expect(client.getFileUrl("")).toBe("");
  });

  // ── 절대 URL 패스스루 ────────────────────────────────────────────

  it("http:// URL은 그대로 반환", () => {
    const url = "http://example.com/photo.jpg";
    expect(client.getFileUrl(url)).toBe(url);
  });

  it("https:// URL은 그대로 반환", () => {
    const url = "https://cdn.example.com/photo.jpg";
    expect(client.getFileUrl(url)).toBe(url);
  });

  it("blob: URL은 그대로 반환 (미리보기 Object URL)", () => {
    const url = "blob:http://localhost/abc-def-123";
    expect(client.getFileUrl(url)).toBe(url);
  });

  it("data: URL은 그대로 반환 (base64 인라인 이미지)", () => {
    const url = "data:image/jpeg;base64,/9j/4AAQSkZJRgAB";
    expect(client.getFileUrl(url)).toBe(url);
  });

  // ── 상대 경로 변환 ────────────────────────────────────────────────

  it("상대 경로를 {baseURL}/files/{path} 형식으로 변환", () => {
    expect(client.getFileUrl("photos/proj/visit/img.jpg")).toBe(
      "http://api.example.com/files/photos/proj/visit/img.jpg"
    );
  });

  it("계약서 경로 변환", () => {
    expect(client.getFileUrl("contracts/123/source.pdf")).toBe(
      "http://api.example.com/files/contracts/123/source.pdf"
    );
  });

  it("서명 경로 변환", () => {
    expect(client.getFileUrl("signatures/456/contractor_20260315120000.png")).toBe(
      "http://api.example.com/files/signatures/456/contractor_20260315120000.png"
    );
  });

  it("백슬래시(Windows 경로)를 슬래시로 정규화", () => {
    expect(client.getFileUrl("photos\\proj\\img.jpg")).toBe(
      "http://api.example.com/files/photos/proj/img.jpg"
    );
  });

  it("다른 baseURL 환경에서도 올바르게 동작", () => {
    const prodClient = new APIClient({ baseURL: "https://api.sigong.co.kr" });
    expect(prodClient.getFileUrl("pricebooks/org-1/price.pdf")).toBe(
      "https://api.sigong.co.kr/files/pricebooks/org-1/price.pdf"
    );
  });
});
