import type { NextRequest } from "next/server";
import { getChatsByUserId, deleteAllChatsByUserId, getDefaultUser } from "@/lib/memory-storage";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  // Use default user (no authentication)
  const user = getDefaultUser();

  const chats = await getChatsByUserId({
    id: user.id,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}

export async function DELETE() {
  // Use default user (no authentication)
  const user = getDefaultUser();

  const result = await deleteAllChatsByUserId({ userId: user.id });

  return Response.json(result, { status: 200 });
}
