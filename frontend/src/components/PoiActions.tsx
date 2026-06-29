import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  useAddComment, useComments, useDeleteComment, useDeleteVisit,
  useUpsertVisit, useVisits,
} from "../queries/hooks";
import { dangerButtonStyle, inputStyle, primaryButtonStyle, theme } from "../theme";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

/** Read-only star rating shown next to a commenter's name. */
function RatingStars({ value }: { value: number }) {
  return (
    <span aria-label={`Rated ${value}`} style={{ color: theme.color.starActive, fontSize: 13, letterSpacing: 1 }}>
      {"★".repeat(value)}
      <span style={{ color: theme.color.starInactive }}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

/** Interactive star rating used to set or change the current user's visit. */
function RatePicker({ value, onRate, size = 26 }: { value: number; onRate: (n: number) => void; size?: number }) {
  return (
    <span aria-label="Rating" style={{ display: "inline-flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n}`}
          onClick={() => onRate(n)}
          style={{ border: "none", background: "none", cursor: "pointer", fontSize: size, lineHeight: 1, padding: 0, color: value >= n ? theme.color.starActive : theme.color.starInactive }}
        >
          {value >= n ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}

export default function PoiActions({ poiId }: { poiId: number }) {
  const { user } = useAuth();
  const meId = user?.id;
  const isAdmin = user?.role === "admin";

  const visits = useVisits(poiId).data ?? [];
  const myVisit = visits.find((v) => v.user_id === meId);
  const ratingByUser = new Map(visits.filter((v) => v.rating != null).map((v) => [v.user_id, v.rating as number]));
  const upsertVisit = useUpsertVisit(poiId);
  const deleteVisit = useDeleteVisit(poiId);

  const comments = useComments(poiId).data ?? [];
  const addComment = useAddComment(poiId);
  const deleteComment = useDeleteComment(poiId);
  const myComments = comments.filter((c) => c.user_id === meId);

  // Recording a first visit: a rating (required) plus an optional comment.
  const [rating, setRating] = useState(0);
  const [firstText, setFirstText] = useState("");
  // Adding further comments once a visit already exists.
  const [newText, setNewText] = useState("");

  function saveFirstVisit() {
    if (rating < 1) return;
    upsertVisit.mutate({ rating });
    const text = firstText.trim();
    if (text !== "") addComment.mutate({ text }, { onSuccess: () => setFirstText("") });
  }

  function postComment() {
    const text = newText.trim();
    if (text !== "") addComment.mutate({ text }, { onSuccess: () => setNewText("") });
  }

  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Record your visit — only until you have one; afterwards the rating
          lives on your comment in the thread below. */}
      {!myVisit && (
        <div style={{ borderRadius: theme.radius.card, border: `1px solid ${theme.color.borderSubtle}`, background: theme.color.pageBg, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ ...sectionLabel, margin: 0 }}>Your visit</p>
          <RatePicker value={rating} onRate={setRating} />
          <textarea
            style={{ ...inputStyle, background: theme.color.surface0, resize: "vertical", minHeight: 56, lineHeight: 1.5 }}
            placeholder="Share a comment (optional)"
            value={firstText}
            onChange={(e) => setFirstText(e.target.value)}
          />
          <button
            type="button"
            onClick={saveFirstVisit}
            disabled={rating < 1}
            aria-label="Save visit"
            style={{ ...primaryButtonStyle, width: "100%", opacity: rating < 1 ? 0.45 : 1, cursor: rating < 1 ? "not-allowed" : "pointer" }}
          >
            {rating < 1 ? "Tap a star to record your visit" : "Save visit"}
          </button>
        </div>
      )}

      <div>
        <p style={sectionLabel}>Comments</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comments.map((c) => {
            const mine = c.user_id === meId;
            const stars = ratingByUser.get(c.user_id);
            return (
              <div key={c.id} style={{ fontSize: 13, lineHeight: 1.45 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700 }}>{c.username}</span>
                  {/* Your own rating is editable inline; everyone else's is read-only. */}
                  {mine && myVisit ? (
                    <RatePicker value={myVisit.rating ?? 0} onRate={(n) => upsertVisit.mutate({ rating: n })} size={16} />
                  ) : (
                    stars != null && <RatingStars value={stars} />
                  )}
                  <span style={{ color: theme.color.textPlaceholder }}>· {new Date(c.created_at).toLocaleDateString()}</span>
                  {(mine || isAdmin) && (
                    <button
                      type="button"
                      aria-label={`Delete comment ${c.id}`}
                      onClick={() => deleteComment.mutate(c.id)}
                      style={{ ...dangerButtonStyle, padding: "1px 8px", fontSize: 11 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div style={{ color: theme.color.textBody }}>{c.text}</div>
              </div>
            );
          })}
          {comments.length === 0 && <div style={{ fontSize: 13, color: theme.color.textPlaceholder }}>No comments yet.</div>}
        </div>

        {/* When you've visited: a place to re-rate (if you left no comment to
            host the stars) and remove the visit, plus add further comments. */}
        {myVisit && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {myComments.length === 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.color.textPlaceholder }}>Your rating</span>
                <RatePicker value={myVisit.rating ?? 0} onRate={(n) => upsertVisit.mutate({ rating: n })} size={18} />
              </div>
            )}
            <textarea
              style={{ ...inputStyle, background: theme.color.surface0, resize: "vertical", minHeight: 48, lineHeight: 1.5 }}
              placeholder="Add a comment"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <button type="button" onClick={() => deleteVisit.mutate()} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: theme.color.dangerText }}>
                Remove visit
              </button>
              <button type="button" onClick={postComment} disabled={newText.trim() === ""} style={{ ...primaryButtonStyle, opacity: newText.trim() === "" ? 0.45 : 1, cursor: newText.trim() === "" ? "not-allowed" : "pointer" }}>
                Post comment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
