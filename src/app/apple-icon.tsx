import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Icoon voor "Zet op beginscherm" op iOS.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const svg = readFileSync(
    join(process.cwd(), "public/brand/beeldmerk-creme.svg"),
    "utf8",
  );
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d1e2e",
        }}
      >
        <img src={src} width={120} height={76} alt="RR Recruitment" />
      </div>
    ),
    size,
  );
}
