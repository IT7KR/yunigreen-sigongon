import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { normalizeSamplePath } from "@/lib/sampleFiles";

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".hwp": "application/x-hwp",
  ".hwpx": "application/haansofthwpx",
  ".txt": "text/plain; charset=utf-8",
};

const SAMPLE_ROOT = resolveSampleRoot();

function resolveSampleRoot(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "sample"),
    path.resolve(cwd, "../sample"),
    path.resolve(cwd, "../../sample"),
    path.resolve(cwd, "../../../sample"),
    path.resolve(cwd, "../../../../sample"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildContentDisposition(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, "_");
  const encodedFileName = encodeURIComponent(fileName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const pathParam = request.nextUrl.searchParams.get("path");
  if (!pathParam) {
    return NextResponse.json(
      { success: false, error: "path 쿼리가 필요해요." },
      { status: 400 },
    );
  }

  if (!SAMPLE_ROOT) {
    return NextResponse.json(
      { success: false, error: "sample 디렉터리를 찾을 수 없어요." },
      { status: 500 },
    );
  }

  const normalizedPath = normalizeSamplePath(pathParam);
  if (!normalizedPath) {
    return NextResponse.json(
      { success: false, error: "유효한 파일 경로가 아니에요." },
      { status: 400 },
    );
  }

  const absolutePath = path.resolve(SAMPLE_ROOT, normalizedPath);
  const relativePath = path.relative(SAMPLE_ROOT, absolutePath);
  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath === ""
  ) {
    return NextResponse.json(
      { success: false, error: "허용되지 않은 파일 경로예요." },
      { status: 400 },
    );
  }

  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return NextResponse.json(
        { success: false, error: "파일만 다운로드할 수 있어요." },
        { status: 400 },
      );
    }

    const fileBuffer = await readFile(absolutePath);
    const fileName = path.basename(absolutePath);
    const extension = path.extname(fileName).toLowerCase();
    const contentType =
      MIME_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        "Content-Disposition": buildContentDisposition(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "샘플 파일을 찾을 수 없어요." },
      { status: 404 },
    );
  }
}
