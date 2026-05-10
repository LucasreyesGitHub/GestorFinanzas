import { ImageResponse } from "next/og"

export const size        = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           180,
          height:          180,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "#141311",
        }}
      >
        <div
          style={{
            width:           104,
            height:          104,
            borderRadius:    "50%",
            background:      "linear-gradient(145deg, #4a7d5a 0%, #2d5438 100%)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            boxShadow:       "0 0 40px rgba(74,125,90,0.4)",
          }}
        >
          <span style={{ color: "white", fontSize: 54, fontWeight: "bold", lineHeight: 1 }}>$</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
