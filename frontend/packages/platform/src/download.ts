export interface DownloadFileOptions {
  url: string;
  fileName: string;
  newTab?: boolean;
}

export function triggerBrowserDownload(options: DownloadFileOptions): void {
  if (typeof window === "undefined") {
    return;
  }

  const { url, fileName, newTab = true } = options;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;

  if (newTab) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }

  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
