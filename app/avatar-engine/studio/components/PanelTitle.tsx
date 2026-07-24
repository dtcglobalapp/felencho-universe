interface PanelTitleProps {
  title: string;
  subtitle: string;
}

export default function PanelTitle({
  title,
  subtitle,
}: PanelTitleProps) {
  return (
    <div
      style={{
        minHeight: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "0 14px",

        borderBottom:
          "1px solid rgba(70,210,255,0.13)",
      }}
    >
      <strong
        style={{
          fontSize: 11,
          letterSpacing: "0.16em",
          color: "#73ddff",
        }}
      >
        {title}
      </strong>

      <span
        style={{
          maxWidth: 150,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",

          color:
            "rgba(255,255,255,0.38)",

          fontSize: 10,
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}
