export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke by a tick: some browsers cancel the download if the object
  // URL is revoked synchronously before the click is fully processed.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
