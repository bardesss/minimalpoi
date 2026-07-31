import { useState, type ChangeEvent } from "react";
import { ApiError } from "../../api/client";
import { safeImageCss } from "../../lib/safeUrl";
import { ghostButtonStyle, theme, fieldLabelStyle } from "../../theme";


// The photo sub-flow of the POI form. Owns its own upload progress/error state
// so a failed or in-flight upload doesn't re-render the rest of the form; the
// resulting image URL lives in the parent, because both submit() and the
// enrich/place-search drafts write it.
export function ImagePicker({
  imageUrl,
  onImageUrl,
  onUploadImage,
}: {
  imageUrl: string | null;
  onImageUrl: (url: string | null) => void;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const safeImage = safeImageCss(imageUrl);

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file || !onUploadImage) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { url } = await onUploadImage(file);
      onImageUrl(url);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed — try a different image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={fieldLabelStyle} htmlFor="poi-image">Photo</label>
      {safeImage && (
        <div aria-label="Image preview" style={{ width: 96, height: 64, borderRadius: theme.radius.input, backgroundImage: `url(${safeImage})`, backgroundSize: "cover", backgroundPosition: "center", border: `1px solid ${theme.color.borderCard}` }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {onUploadImage && (
          <input id="poi-image" type="file" accept="image/*" aria-label="Choose image" onChange={onPickFile} style={{ fontSize: 12 }} />
        )}
        {imageUrl && (
          <button type="button" onClick={() => onImageUrl(null)} style={{ ...ghostButtonStyle, padding: "6px 12px" }}>Remove image</button>
        )}
      </div>
      {uploading && <span role="status" style={{ fontSize: 12, color: theme.color.textPlaceholder }}>Uploading…</span>}
      {uploadError && <div role="status" style={{ fontSize: 12, color: theme.color.dangerText }}>{uploadError}</div>}
    </div>
  );
}
