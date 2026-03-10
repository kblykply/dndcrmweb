"use client";

export default function LeadAvatar({
  avatarUrl,
  name,
  size = 44,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials =
    (name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "L";

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt={name || "Lead"}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "#111",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        fontSize: Math.max(12, Math.floor(size / 2.5)),
        userSelect: "none",
      }}
      title={name || "Lead"}
    >
      {initials}
    </div>
  );
}