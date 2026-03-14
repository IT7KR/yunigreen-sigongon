/**
 * FileUpload 컴포넌트 단위 테스트
 *
 * uploadProgress prop 및 기본 렌더링을 검증합니다.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileUpload } from "./FileUpload";

describe("FileUpload", () => {
  const defaultProps = {
    onFiles: vi.fn(),
  };

  // ── uploadProgress prop ──────────────────────────────────────────

  describe("uploadProgress prop", () => {
    it("uploadProgress 미전달 시 프로그레스바 미표시", () => {
      render(<FileUpload {...defaultProps} />);
      expect(screen.queryByText(/업로드 중/)).not.toBeInTheDocument();
    });

    it("uploadProgress=50이면 프로그레스바와 '50%' 텍스트 표시", () => {
      render(<FileUpload {...defaultProps} uploadProgress={50} />);
      expect(screen.getByText("업로드 중...")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("uploadProgress=0이면 프로그레스바 표시 (경계값)", () => {
      render(<FileUpload {...defaultProps} uploadProgress={0} />);
      expect(screen.getByText("업로드 중...")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("uploadProgress=100이면 프로그레스바 표시 (경계값)", () => {
      render(<FileUpload {...defaultProps} uploadProgress={100} />);
      expect(screen.getByText("업로드 중...")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("uploadProgress=67.8이면 반올림하여 '68%' 표시", () => {
      render(<FileUpload {...defaultProps} uploadProgress={67.8} />);
      expect(screen.getByText("68%")).toBeInTheDocument();
    });

    it("uploadProgress=1.2이면 반올림하여 '1%' 표시", () => {
      render(<FileUpload {...defaultProps} uploadProgress={1.2} />);
      expect(screen.getByText("1%")).toBeInTheDocument();
    });

    it("uploadProgress=-1이면 프로그레스바 미표시 (범위 이하)", () => {
      render(<FileUpload {...defaultProps} uploadProgress={-1} />);
      expect(screen.queryByText(/업로드 중/)).not.toBeInTheDocument();
    });

    it("uploadProgress=101이면 프로그레스바 미표시 (범위 초과)", () => {
      render(<FileUpload {...defaultProps} uploadProgress={101} />);
      expect(screen.queryByText(/업로드 중/)).not.toBeInTheDocument();
    });
  });

  // ── 기본 렌더링 ───────────────────────────────────────────────────

  describe("기본 렌더링", () => {
    it("드롭존 안내 텍스트가 표시됨", () => {
      render(<FileUpload {...defaultProps} />);
      expect(
        screen.getByText("파일을 드래그하거나 클릭하여 선택하세요")
      ).toBeInTheDocument();
    });

    it("disabled 상태에서 드롭존이 aria-disabled='true'", () => {
      render(<FileUpload {...defaultProps} disabled />);
      const dropzone = screen.getByRole("button");
      expect(dropzone).toHaveAttribute("aria-disabled", "true");
    });

    it("accept prop이 있으면 허용 형식 텍스트 표시", () => {
      render(<FileUpload {...defaultProps} accept="image/jpeg,image/png" />);
      expect(screen.getByText(/image\/jpeg/)).toBeInTheDocument();
    });
  });
});
