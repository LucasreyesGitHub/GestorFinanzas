import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

export const runtime = "edge"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const size = Math.min(512, Math.max(16, parseInt(searchParams.get("size") ?? "192")))

  const circle = Math.round(size * 0.58)
  const font   = Math.round(size * 0.3)

  return new ImageResponse(
    (
      <div
        style={{
          width:           size,
          height:          size,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          background:      "#141311",
        }}
      >
        <div
          style={{
            width:           circle,
            height:          circle,
            borderRadius:    "50%",
            background:      "linear-gradient(145deg, #4a7d5a 0%, #2d5438 100%)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            boxShadow:       "0 0 40px rgba(74,125,90,0.35)",
          }}
        >
          <span
            style={{
              color:      "white",
              fontSize:   font,
              fontWeight: "bold",
              lineHeight: 1,
            }}
          >
            $
          </span>
        </div>
      </div>
    ),
    { width: size, height: size },
  )
}
