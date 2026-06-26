import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  useAddComment, useAddWishlist, useComments, useDeleteComment, useDeleteVisit,
  useRemoveWishlist, useUpsertVisit, useVisits, useWishlist,
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

  const wishlist = useWishlist(poiId).data ?? [];
  const wished = wishlist.some((w) => w.user_id === meId);
  const addWishlist = useAddWishlist(poiId);
  const removeWishlist = useRemoveWishlist(poiId);

  const comments = useComments(poiId).data ?? [];
  const addComment = useAddComment(poiId);
  const deleteComment = useDeleteComment(poiId);
  const [text, setText] = useState("");

  function submitComment() {
    if (text.trim() === "") return;
    addComment.mutate({ text: text.trim() }, { onSuccess: () => setText("") });
  }

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <p style={sectionLabel}>Visited</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {myVisit ? (
            <button type="button" onClick={() => deleteVisit.mutate()} style={ghostButtonStyle}>Visited ✓</button>
          ) : (
            <button type="button" onClick={() => upsertVisit.mutate({})} style={primaryButtonStyle}>Mark visited</button>
          )}
          {myVisit && (
            <span aria-label="Rating" style={{ display: "inline-flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Rate ${n}`}
                  onClick={() => upsertVisit.mutate({ rating: n })}
                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: (myVisit.rating ?? 0) >= n ? theme.color.fallbackPin : theme.color.borderCard }}
                >
                  {(myVisit.rating ?? 0) >= n ? "★" : "☆"}
                </button>
              ))}
            </span>
          )}
          <button type="button" onClick={() => (wished ? removeWishlist.mutate() : addWishlist.mutate())} style={{ ...ghostButtonStyle, marginLeft: "auto" }}>
            {wished ? "♥ Wishlisted" : "♡ Wishlist"}
          </button>
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
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Add a comment"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
            />
            <button type="button" onClick={submitComment} style={primaryButtonStyle}>Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}
