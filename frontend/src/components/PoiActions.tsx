import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  useAddComment, useComments, useDeleteComment, useDeleteVisit,
  useUpdateComment, useUpsertVisit, useVisits,
} from "../queries/hooks";
import { dangerButtonStyle, inputStyle, primaryButtonStyle, theme } from "../theme";

const sectionLabel = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: theme.color.textPlaceholder, margin: "0 0 8px" } as const;

/** Read-only star rating shown next to a reviewer's name. */
function RatingStars({ value }: { value: number }) {
  return (
    <span aria-label={`Rated ${value}`} style={{ color: theme.color.starActive, fontSize: 13, letterSpacing: 1 }}>
      {"★".repeat(value)}
      <span style={{ color: theme.color.starInactive }}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

/** Interactive star rating used to set or change your own review. */
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

/**
 * A person's review = one rating + one comment, kept as a single unit. You set
 * yours with a star (required) and an optional note; one Edit changes both and
 * one Delete removes both. Everyone else's review is read-only (admins may
 * delete it).
 */
export default function PoiActions({ poiId }: { poiId: number }) {
  const { user } = useAuth();
  const meId = user?.id;
  const isAdmin = user?.role === "admin";

  const visits = useVisits(poiId).data ?? [];
  const myVisit = visits.find((v) => v.user_id === meId);
  const ratingByUser = new Map(visits.filter((v) => v.rating != null).map((v) => [v.user_id, v.rating as number]));

  const comments = useComments(poiId).data ?? [];
  const myComments = comments.filter((c) => c.user_id === meId);
  const myComment = myComments[0];
  // One review per person: each other user's first comment anchors their review.
  const otherReviews = (() => {
    const seen = new Set<number>();
    const out: typeof comments = [];
    for (const c of comments) {
      if (c.user_id === meId || seen.has(c.user_id)) continue;
      seen.add(c.user_id);
      out.push(c);
    }
    return out;
  })();

  const upsertVisit = useUpsertVisit(poiId);
  const deleteVisit = useDeleteVisit(poiId);
  const addComment = useAddComment(poiId);
  const updateComment = useUpdateComment(poiId);
  const deleteComment = useDeleteComment(poiId);

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  // Show the editor while you have no review, or while editing an existing one.
  const showEditor = !myVisit || editing;

  function openEdit() {
    setRating(myVisit?.rating ?? 0);
    setText(myComment?.text ?? "");
    setEditing(true);
  }

  function saveReview() {
    if (rating < 1) return;
    upsertVisit.mutate({ rating });
    const t = text.trim();
    if (myComment) {
      if (t === "") deleteComment.mutate(myComment.id);
      else if (t !== myComment.text) updateComment.mutate({ commentId: myComment.id, text: t });
    } else if (t !== "") {
      addComment.mutate({ text: t });
    }
    setEditing(false);
  }

  function deleteMyReview() {
    deleteVisit.mutate();
    for (const c of myComments) deleteComment.mutate(c.id);
  }

  return (
    <div style={{ marginTop: 18 }}>
      <p style={sectionLabel}>Reviews</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Your review */}
        {showEditor ? (
          <div style={{ borderRadius: theme.radius.card, border: `1px solid ${theme.color.borderSubtle}`, background: theme.color.pageBg, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ ...sectionLabel, margin: 0 }}>Your review</p>
            <RatePicker value={rating} onRate={setRating} />
            <textarea
              style={{ ...inputStyle, background: theme.color.surface0, resize: "vertical", minHeight: 56, lineHeight: 1.5 }}
              placeholder="Share a comment (optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={saveReview}
                disabled={rating < 1}
                aria-label="Save review"
                style={{ ...primaryButtonStyle, flex: 1, opacity: rating < 1 ? 0.45 : 1, cursor: rating < 1 ? "not-allowed" : "pointer" }}
              >
                {rating < 1 ? "Tap a star to rate" : "Save review"}
              </button>
              {editing && (
                <button type="button" onClick={() => setEditing(false)} style={{ border: "none", background: "none", padding: "0 6px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: theme.color.textPlaceholder }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.45 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700 }}>{user?.username}</span>
              {myVisit?.rating != null && <RatingStars value={myVisit.rating} />}
              <button type="button" aria-label="Edit review" onClick={openEdit} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 700, color: theme.color.primary }}>
                Edit
              </button>
              <button type="button" aria-label="Delete review" onClick={deleteMyReview} style={{ ...dangerButtonStyle, padding: "1px 8px", fontSize: 11 }}>
                Delete
              </button>
            </div>
            {myComment?.text && <div style={{ color: theme.color.textBody }}>{myComment.text}</div>}
          </div>
        )}

        {/* Everyone else's reviews — read-only (admins may delete). */}
        {otherReviews.map((c) => {
          const stars = ratingByUser.get(c.user_id);
          return (
            <div key={c.id} style={{ fontSize: 13, lineHeight: 1.45 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700 }}>{c.username}</span>
                {stars != null && <RatingStars value={stars} />}
                <span style={{ color: theme.color.textPlaceholder }}>· {new Date(c.created_at).toLocaleDateString()}</span>
                {isAdmin && (
                  <button type="button" aria-label={`Delete ${c.username}'s review`} onClick={() => deleteComment.mutate(c.id)} style={{ ...dangerButtonStyle, padding: "1px 8px", fontSize: 11 }}>
                    Delete
                  </button>
                )}
              </div>
              <div style={{ color: theme.color.textBody }}>{c.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
