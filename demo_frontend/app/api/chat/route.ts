import { NextRequest } from "next/server";

// Default user ID and conversation ID for the application
const DEFAULT_USER_ID = "default-user";
const DEFAULT_CONVERSATION_ID = "default-conversation";

/**
 * POST handler for chat API that proxies requests to the backend.
 * Automatically adds default user_id and conversation_id to prevent backend errors.
 * @param req - Next.js request object
 * @returns Streaming response from backend
 */
export async function POST(req: NextRequest) {
    try {
        // Read request body from frontend
        const bodyText = await req.text();
        let body = {};

        try {
            body = JSON.parse(bodyText);
        } catch (e) {
            console.error("Failed to parse request body:", e);
        }

        // // Add default user_id and conversation_id if not present
        // const requestBody = {
        //   ...body,
        //   user_id: body.user_id || DEFAULT_USER_ID,
        //   conversation_id: body.conversation_id || DEFAULT_CONVERSATION_ID,
        // };

        // Backend SSE API endpoint
        const backendUrl =
            process.env.BACKENDURL || "http://127.0.0.1:8000/api/chat";

        // Forward request to backend
        const backendResponse = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!backendResponse.body) {
            return new Response("No SSE body", { status: 500 });
        }

        // Stream backend SSE response directly to frontend
        const stream = new ReadableStream({
            async start(controller) {
                const reader = backendResponse.body!.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    const text = new TextDecoder().decode(value);
                    console.log(text);
                    if (done) break;
                    controller.enqueue(value);
                }
                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response("Internal server error", { status: 500 });
    }
}
