/**
 * Simple in-memory storage to replace database functionality
 * Note: All data will be lost when the server restarts
 */

import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import type { AppUsage } from "./usage";

export type User = {
  id: string;
  email: string;
};

export type Chat = {
  id: string;
  createdAt: Date;
  title: string;
  userId: string;
  visibility: VisibilityType;
  lastContext?: AppUsage | null;
};

export type DBMessage = {
  id: string;
  chatId: string;
  role: string;
  parts: any;
  attachments: any[];
  createdAt: Date;
};

export type Vote = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

export type Document = {
  id: string;
  createdAt: Date;
  title: string;
  content: string;
  kind: ArtifactKind;
  userId: string;
};

export type Suggestion = {
  id: string;
  documentId: string;
  documentCreatedAt: Date;
  originalText: string;
  suggestedText: string;
  description?: string;
  isResolved: boolean;
  userId: string;
  createdAt: Date;
};

export type Stream = {
  id: string;
  chatId: string;
  createdAt: Date;
};

// In-memory storage
const storage = {
  users: new Map<string, User>(),
  chats: new Map<string, Chat>(),
  messages: new Map<string, DBMessage>(),
  votes: new Map<string, Vote>(),
  documents: new Map<string, Document[]>(),
  suggestions: new Map<string, Suggestion>(),
  streams: new Map<string, Stream>(),
};

// Default user for local deployment (no auth)
const DEFAULT_USER_ID = "local-user";
const DEFAULT_USER_EMAIL = "local@example.com";

// Initialize default user
storage.users.set(DEFAULT_USER_ID, {
  id: DEFAULT_USER_ID,
  email: DEFAULT_USER_EMAIL,
});

export function getDefaultUser() {
  return storage.users.get(DEFAULT_USER_ID)!;
}

export async function saveChat(chat: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  storage.chats.set(chat.id, {
    ...chat,
    createdAt: new Date(),
  });
}

export async function getChatById({ id }: { id: string }) {
  return storage.chats.get(id) || null;
}

export async function getChatsByUserId({
  id,
  limit,
}: {
  id: string;
  limit: number;
  startingAfter?: string | null;
  endingBefore?: string | null;
}) {
  const userChats = Array.from(storage.chats.values())
    .filter((chat) => chat.userId === id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  return {
    chats: userChats,
    hasMore: false,
  };
}

export async function deleteChatById({ id }: { id: string }) {
  // Delete related votes
  Array.from(storage.votes.values()).forEach((vote) => {
    if (vote.chatId === id) {
      storage.votes.delete(`${vote.chatId}-${vote.messageId}`);
    }
  });

  // Delete related messages
  Array.from(storage.messages.values()).forEach((message) => {
    if (message.chatId === id) {
      storage.messages.delete(message.id);
    }
  });

  // Delete related streams
  Array.from(storage.streams.values()).forEach((stream) => {
    if (stream.chatId === id) {
      storage.streams.delete(stream.id);
    }
  });

  const chat = storage.chats.get(id);
  storage.chats.delete(id);
  return chat;
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  const userChats = Array.from(storage.chats.values()).filter(
    (chat) => chat.userId === userId
  );

  for (const chat of userChats) {
    await deleteChatById({ id: chat.id });
  }

  return { deletedCount: userChats.length };
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  for (const message of messages) {
    storage.messages.set(message.id, message);
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  return Array.from(storage.messages.values())
    .filter((message) => message.chatId === id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getMessageById({ id }: { id: string }) {
  const message = storage.messages.get(id);
  return message ? [message] : [];
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const messagesToDelete = Array.from(storage.messages.values()).filter(
    (message) =>
      message.chatId === chatId && message.createdAt >= timestamp
  );

  const messageIds = messagesToDelete.map((m) => m.id);

  // Delete related votes
  for (const messageId of messageIds) {
    storage.votes.delete(`${chatId}-${messageId}`);
  }

  // Delete messages
  for (const messageId of messageIds) {
    storage.messages.delete(messageId);
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  const key = `${chatId}-${messageId}`;
  storage.votes.set(key, {
    chatId,
    messageId,
    isUpvoted: type === "up",
  });
}

export async function getVotesByChatId({ id }: { id: string }) {
  return Array.from(storage.votes.values()).filter(
    (vote) => vote.chatId === id
  );
}

export async function saveDocument(doc: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  const document: Document = {
    ...doc,
    createdAt: new Date(),
  };

  const existing = storage.documents.get(doc.id) || [];
  existing.push(document);
  storage.documents.set(doc.id, existing);

  return [document];
}

export async function getDocumentsById({ id }: { id: string }) {
  return storage.documents.get(id) || [];
}

export async function getDocumentById({ id }: { id: string }) {
  const documents = storage.documents.get(id) || [];
  return documents[documents.length - 1];
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  const documents = storage.documents.get(id) || [];
  const filtered = documents.filter((doc) => doc.createdAt <= timestamp);
  storage.documents.set(id, filtered);

  // Delete related suggestions
  Array.from(storage.suggestions.values()).forEach((suggestion) => {
    if (
      suggestion.documentId === id &&
      suggestion.documentCreatedAt > timestamp
    ) {
      storage.suggestions.delete(suggestion.id);
    }
  });

  return documents.filter((doc) => doc.createdAt > timestamp);
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  for (const suggestion of suggestions) {
    storage.suggestions.set(suggestion.id, suggestion);
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  return Array.from(storage.suggestions.values()).filter(
    (suggestion) => suggestion.documentId === documentId
  );
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  const chat = storage.chats.get(chatId);
  if (chat) {
    chat.visibility = visibility;
    storage.chats.set(chatId, chat);
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  context: AppUsage;
}) {
  const chat = storage.chats.get(chatId);
  if (chat) {
    chat.lastContext = context;
    storage.chats.set(chatId, chat);
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  const cutoffTime = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);

  const userChats = Array.from(storage.chats.values())
    .filter((chat) => chat.userId === id)
    .map((chat) => chat.id);

  const count = Array.from(storage.messages.values()).filter(
    (message) =>
      userChats.includes(message.chatId) &&
      message.role === "user" &&
      message.createdAt >= cutoffTime
  ).length;

  return count;
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  storage.streams.set(streamId, {
    id: streamId,
    chatId,
    createdAt: new Date(),
  });
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  return Array.from(storage.streams.values())
    .filter((stream) => stream.chatId === chatId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((stream) => stream.id);
}
