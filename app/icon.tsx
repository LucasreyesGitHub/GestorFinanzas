import { ImageResponse } from "next/og"

export const size        = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:           32,
          height:          32,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "#141311",
          borderRadius:    6,
        }}
      >
        <div
          style={{
            width:           22,
            height:          22,
            borderRadius:    "50%",
            background:      "#4a7d5a",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
          }}
        >
          <span style={{ color: "white", fontSize: 13, fontWeight: "bold", lineHeight: 1 }}>$</span>
        </div>
      </div>
    ),
    { ...size },
  )
}
