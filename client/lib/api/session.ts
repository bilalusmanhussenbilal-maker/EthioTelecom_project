/**
 * A 401 from the API is not just one failed call: it means the session the browser holds is no
 * longer valid. That happens when the token expires, when the account signs out somewhere else,
 * when an administrator resets the password, or when the account is deactivated.
 *
 * No view can recover from that by retrying, so the API client announces it once and the auth
 * provider ends the session, which sends the user back to sign in. Handling it centrally keeps
 * every screen from inventing its own dead-end error state.
 */
type SessionRejectedListener = () => void;

const listeners = new Set<SessionRejectedListener>();

/** Subscribes to session rejections. Returns the unsubscribe function. */
export function onSessionRejected(listener: SessionRejectedListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionRejected(): void {
  // Copy first: a listener may unsubscribe while we are iterating.
  for (const listener of [...listeners]) {
    listener();
  }
}