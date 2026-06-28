import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  useAddComment, useComments, useDeleteComment, useDeleteVisit,
  useUpsertVisit, useVisits,
} from "../queries/hooks";
import { dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, theme } from "../theme";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

export default function PoiActions({ poiId }: { poiId: number }) {
  const { user } = useAuth();
  const meId = user?.id;

  const visits = useVisits(poiId).data ?? [];
  const myVisit = visits.find((v) => v.user_id === meId);
  const upsertVisit = useUpsertVisit(poiId);
  const deleteVisit = useDeleteVisit(poiId);

  const comments = useComments(poiId).data ?? [];
  const addComment = useAddComment(poiId);
  const deleteComment = useDeleteComment(poiId);

  // The visit is one action: a star rating (which marks the place visited) plus
  // an optional comment, saved together. Seed the stars from any existing visit.
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  useEffect(() => setRating(myVisit?.rating ?? 0), [myVisit?.rating]);

  function save() {
    if (rating < 1) return;
    upsertVisit.mutate({ rating });
    const comment = text.trim();
    if (comment !== "") addComment.mutate({ text: comment }, { onSuccess: () => setText("") });
  }

  function removeVisit() {
    deleteVisit.mutate();
    setRating(0);
  }

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <p style={sectionLabel}>Your visit</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span aria-label="Rating" style={{ display: "inline-flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Rate ${n}`}
                  onClick={() => setRating(n)}
                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, color: rating >= n ? theme.color.fallbackPin : theme.color.borderCard }}
                >
                  {rating >= n ? "★" : "☆"}
                </button>
              ))}
            </span>
            {myVisit && (
              <button type="button" onClick={removeVisit} style={{ ...ghostButtonStyle, marginLeft: "auto" }}>Remove</button>
            )}
          </div>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: 38 }}
            placeholder="Add a comment (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            onClick={save}
            disabled={rating < 1}
            style={{ ...primaryButtonStyle, alignSelf: "flex-start", opacity: rating < 1 ? 0.5 : 1, cursor: rating < 1 ? "not-allowed" : "pointer" }}
          >
            {myVisit ? "Save" : "Save visit"}
          </button>
          {rating < 1 && <span style={{ fontSize: 12, color: theme.color.textPlaceholder }}>Pick a rating to record your visit.</span>}
        </div>
      </div>

      <div>
        <p style={sectionLabel}>Comments</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ fontSize: 13, lineHeight: 1.45 }}>
              <span style={{ fontWeight: 700 }}>{c.username}</span>
              <span style={{ color: theme.color.textPlaceholder }}> · {new Date(c.created_at).toLocaleDateString()}</span>
              {(c.user_id === meId || user?.role === "admin") && (
                <button
                  type="button"
                  aria-label={`Delete comment ${c.id}`}
                  onClick={() => deleteComment.mutate(c.id)}
                  style={{ ...dangerButtonStyle, padding: "1px 8px", marginLeft: 8, fontSize: 11 }}
                >
                  Delete
                </button>
              )}
              <div style={{ color: theme.color.textBody }}>{c.text}</div>
            </div>
          ))}
          {comments.length === 0 && <div style={{ fontSize: 13, color: theme.color.textPlaceholder }}>No comments yet.</div>}
        </div>
      </div>
    </div>
  );
}
