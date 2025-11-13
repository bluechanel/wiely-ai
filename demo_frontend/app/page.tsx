import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/models";

export default async function Page() {
    const id = "test";
    return (
        <>
            <Chat
                id={id}
                initialChatModel={DEFAULT_CHAT_MODEL}
                initialMessages={[]}
                isReadonly={false}
                key={id}
            />
        </>
    );
}
