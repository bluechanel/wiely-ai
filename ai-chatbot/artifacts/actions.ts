"use server";

import { getSuggestionsByDocumentId } from "@/lib/memory-storage";

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}
