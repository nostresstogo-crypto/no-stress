/**
 * shareWithImage
 * ──────────────
 * Shares a text message and, when an imageUrl is provided, attaches the photo
 * so the recipient sees it as an embedded image rather than a raw URL.
 *
 * Flow:
 * 1. iOS  — Share.share() with { url: localUri, message } passes both image
 *           and text to the native share sheet in one call.
 * 2. Android — expo-sharing (Sharing.shareAsync) passes the local image file
 *           via an ACTION_SEND intent; the text is shared as a separate step
 *           using the standard Share API after the image share.
 * 3. Fallback (web / download failures) — Share.share() with the full text
 *           body and the image URL appended as a plain link.
 *
 * react-native-share is intentionally NOT used here because it requires a
 * native binary that is unavailable in Expo Go and breaks route loading.
 */

import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export async function shareWithImage(opts: {
  /** Short title shown in the share sheet header / dialog title. */
  title: string;
  /**
   * Full body text to deliver alongside the image.
   * Should contain venue name, date, location, download links, etc.
   */
  message: string;
  /** Remote HTTPS image URL. Omit / pass null for text-only sharing. */
  imageUrl?: string | null;
}): Promise<void> {
  const { title, message, imageUrl } = opts;

  // ── Attempt image file attachment ──────────────────────────────────────
  if (imageUrl) {
    try {
      if (FileSystem.cacheDirectory) {
        const rawExt = imageUrl.split("?")[0].split(".").pop()?.toLowerCase();
        const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt ?? "")
          ? rawExt!
          : "jpg";
        const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
        const localUri = `${FileSystem.cacheDirectory}share_preview.${ext}`;

        const result = await FileSystem.downloadAsync(imageUrl, localUri);
        if (result.status === 200) {
          if (Platform.OS === "ios") {
            // iOS: Share.share with url + message handles image + text natively.
            await Share.share({ title, message, url: result.uri });
          } else {
            // Android: expo-sharing passes the image via ACTION_SEND intent.
            // We then share the text separately so the recipient gets both.
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              // Share image first (opens the native share sheet with the photo).
              await Sharing.shareAsync(result.uri, {
                mimeType,
                dialogTitle: title,
                UTI: mimeType,
              });
              // Then offer the text so it can be copied / shared independently.
              await Share.share({ title, message });
            } else {
              // expo-sharing not available — fall back to text-only with link.
              throw new Error("sharing unavailable");
            }
          }
          return;
        }
      }
    } catch (err: any) {
      const msg: string =
        typeof err?.message === "string" ? err.message.toLowerCase() : "";
      // User dismissed the sheet — treat as success.
      if (msg.includes("cancel") || msg.includes("dismiss") || err?.dismissedAction) {
        return;
      }
      // Image download / share failed — fall through to text-only sharing.
    }
  }

  // ── Text-only fallback ─────────────────────────────────────────────────
  const body = imageUrl ? `${message}\n${imageUrl}` : message;
  await Share.share({ title, message: body });
}
