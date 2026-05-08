export type ExpoPushMessage = {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
};

export async function notifyEventApproved(_eventId: number): Promise<void> {
  return;
}

export async function upsertPushToken(_input: {
  token: string;
  platform?: string | null;
  city?: string | null;
  favoriteCategories?: string[] | null;
  language?: string | null;
}): Promise<void> {
  return;
}

export async function deletePushToken(_token: string): Promise<void> {
  return;
}
