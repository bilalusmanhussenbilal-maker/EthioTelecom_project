"use client";

/**
 * Last resort: this replaces the root layout itself, so it cannot rely on `globals.css`, the
 * theme provider or any shared component. Everything here is deliberately self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#0b0b0c",
          color: "#f4f4f5",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            The application could not start
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", margin: "0 0 1rem" }}>
            Something failed before the page could be rendered. Reloading usually fixes it.
          </p>

          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#a1a1aa", margin: "0 0 1rem" }}>
              Reference code:{" "}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {error.digest}
              </span>
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              cursor: "pointer",
              borderRadius: "0.5rem",
              border: "1px solid #3f3f46",
              background: "#f4f4f5",
              color: "#0b0b0c",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
