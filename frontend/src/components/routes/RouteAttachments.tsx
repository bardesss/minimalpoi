import { useRef } from "react";
import type { RouteAttachment } from "../../types/api";
import { theme } from "../../theme";
import { attachmentUrl } from "../../api/routes";
import { useDeleteRouteAttachment, useUploadRouteAttachment } from "../../queries/hooks";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Tickets/confirmations for a single stop or stay. PDF + image uploads; the
// backend enforces the magic-byte allowlist and size cap.
export default function RouteAttachments({
  routeId,
  nodeId,
  attachments,
  canEdit,
}: {
  routeId: number;
  nodeId: number;
  attachments: RouteAttachment[];
  canEdit: boolean;
}) {
  const upload = useUploadRouteAttachment(routeId);
  const del = useDeleteRouteAttachment(routeId);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload.mutate({ file, nodeId });
    e.target.value = ""; // allow re-picking the same file
  }

  return (
    <div style={{ marginTop: 8 }}>
      {attachments.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
          {attachments.map((a) => (
            <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <a
                href={attachmentUrl(routeId, a.id)}
                target="_blank"
                rel="noreferrer"
                style={{ color: theme.color.link, textDecoration: "none", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                📎 {a.filename}
              </a>
              <span style={{ color: theme.color.textPlaceholder }}>{prettySize(a.size)}</span>
              {canEdit && (
                <button
                  type="button"
                  aria-label={`Delete ${a.filename}`}
                  onClick={() => del.mutate(a.id)}
                  style={{ marginLeft: "auto", border: "none", background: "none", color: theme.color.dangerText, cursor: "pointer", fontSize: 14, lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <label
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: attachments.length ? 6 : 0, fontSize: 12, fontWeight: 700, color: theme.color.deepIndigoText, cursor: "pointer" }}
        >
          + Add file
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            aria-label="Add file"
            onChange={onFile}
            disabled={upload.isPending}
            style={{ display: "none" }}
          />
        </label>
      )}
    </div>
  );
}
