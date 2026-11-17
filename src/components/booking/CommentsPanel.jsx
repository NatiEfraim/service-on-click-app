/**
 * A booking's comments in its side panel - the same in the management drawer and the requester's: a titled panel with
 * the count, then each comment (its author and when, then its text), or "אין הערות". Each drawer passes its comments in
 * one shape: [{ id, author, when, text }]. Styles: components.css (.comments-list).
 */
export function CommentsPanel({ comments }) {
  return (
    <section className="panel">
      <header>
        <h2>הערות</h2>
        <span className="hint">{comments.length}</span>
      </header>
      <div className="body">
        {comments.length ? (
          <ul className="comments-list">
            {comments.map((comment) => (
              <li key={comment.id}>
                <div className="small muted">
                  <b className="comment-by">{comment.author}</b> {comment.when}
                </div>
                <div>{comment.text}</div>
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted small">אין הערות.</span>
        )}
      </div>
    </section>
  );
}
