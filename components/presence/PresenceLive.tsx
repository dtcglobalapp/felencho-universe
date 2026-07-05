"use client";

type PresenceLiveProps = {
  character: string;
};

export default function PresenceLive({ character }: PresenceLiveProps) {
  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        cursor: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#67e8f9",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            fontSize: "clamp(2rem, 5vw, 5rem)",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {character}
        </div>

        <div
          style={{
            marginTop: "1rem",
            fontSize: "clamp(1rem, 2vw, 2rem)",
            color: "#a5f3fc",
          }}
        >
          Live mode preparando conexión...
        </div>
      </div>
    </main>
  );
}