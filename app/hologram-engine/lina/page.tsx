/** Independent, cost-free 3D preview. Does not mount LiveAvatar or PresenceLive. */
export default function LinaHologramEnginePage() {
  return (
    <main style={{ width: "100vw", height: "100dvh", overflow: "hidden", background: "#020710" }}>
      <iframe
        title="Felencho Hologram Engine — lina"
        src="/hologram-engine/engine.html?character=lina"
        allow="autoplay"
        style={{ border: 0, width: "100%", height: "100%" }}
      />
    </main>
  );
}
