import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json(
      { error: 'Missing "room" query parameter' },
      { status: 400 },
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const client = new RoomServiceClient(wsUrl, apiKey, apiSecret);

  try {
    const participants = await client.listParticipants(room);
    return NextResponse.json(
      { count: participants.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Room may not exist yet (no one has joined), return 0
    return NextResponse.json(
      { count: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
