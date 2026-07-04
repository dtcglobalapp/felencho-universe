"use client";

export default function FelenchoPresencePage() {
  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
        cursor: "none",
      }}
    >
      <video
        src="/videos/felencho.mp4"
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        preload="auto"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          background: "#000",
        }}
      />
    </main>
  );
}