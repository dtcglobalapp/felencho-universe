import { ACTOR_ENGINE } from "./lib/VERSION";

export default function AvatarEnginePage() {
  return (
    <main
      style={{
        background: "#050505",
        color: "#ffffff",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: 900,
          maxWidth: "90%",
          border: "1px solid #333",
          borderRadius: 12,
          padding: 40,
          background: "#101010",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(0,255,255,.08)",
        }}
      >
        <h1 style={{ fontSize: 42, marginBottom: 10 }}>
          {ACTOR_ENGINE.name}
        </h1>

        <h2
          style={{
            color: "#66ccff",
            fontWeight: 300,
            marginBottom: 30,
          }}
        >
          {ACTOR_ENGINE.codename}
        </h2>

        <hr
          style={{
            borderColor: "#222",
            marginBottom: 30,
          }}
        />

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 18,
          }}
        >
          <tbody>
            <tr>
              <td>Version</td>
              <td>{ACTOR_ENGINE.version}</td>
            </tr>

            <tr>
              <td>Renderer</td>
              <td>{ACTOR_ENGINE.renderer}</td>
            </tr>

            <tr>
              <td>Status</td>
              <td>{ACTOR_ENGINE.status}</td>
            </tr>

            <tr>
              <td>Author</td>
              <td>{ACTOR_ENGINE.author}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            marginTop: 50,
            color: "#888",
          }}
        >
          Engine initialized successfully.
        </div>
      </div>
    </main>
  );
}
