export async function getExpoPushToken(): Promise<string | null> {
  return null;
}

export async function registerPushPreferences(_prefs: {
  city?: string | null;
  favoriteCategories?: string[];
  language?: "fr" | "en";
}): Promise<void> {
  return;
}
