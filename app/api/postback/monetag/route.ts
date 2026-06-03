import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Monetag SmartLink postbacks are deprecated. Use Adsterra reconciliation for SmartLink tasks.",
    },
    { status: 410 },
  );
}
