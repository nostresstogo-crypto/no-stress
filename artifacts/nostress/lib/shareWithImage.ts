/**
 * shareWithImage
 * ──────────────
 * Shares a text message and, when an imageUrl is provided, attaches the photo
 * so the recipient sees it as an embedded image rather than a raw URL.
 *
 * Flow:
 * 1. If expo-sharing is available (iOS / Android): download the image to the
 *    app's local cache directory, then call Sharing.shareAsync() with the
 *    local file URI and the correct MIME type.  This causes messaging apps
 *    (WhatsApp, Telegram, iMessage, Mail, …) to display the photo inline.
 * 2. If the download fails or expo-sharing is unavailable, fall back to
 *    React Native's Share.share() with the full text message (title, venue,
 *    date, download links) plus the image URL appended as a clickable link —
 *    matching the pre-existing sharing behaviour.
 */

import { Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export async function shareWithImage(opts: {
  /** Short title shown in the share sheet header / dialog title. */
  title: string;
  /**
   * Full body text to deliver as plain text when image sharing is unavailable.
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
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && FileSystem.cacheDirectory) {
        // Derive a safe file extension from the URL (default to jpg).
        const rawExt = imageUrl.split("?")[0].split(".").pop()?.toLowerCase();
        const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt ?? "")
          ? rawExt!
          : "jpg";
        const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
        const localUri = `${FileSystem.cacheDirectory}share_preview.${ext}`;

        const result = await FileSystem.downloadAsync(imageUrl, localUri);
        if (result.status === 200) {
          await Sharing.shareAsync(result.uri, {
            mimeType,
            dialogTitle: title,
            UTI: "public.image",
          });
          return;
        }
      }
    } catch {
      // Image download / share failed — fall through to text-only sharing.
    }
  }

  // ── Text-only fallback ─────────────────────────────────────────────────
  // Append the image URL as a clickable link so recipients can still view
  // the photo even when the file-attachment path is unavailable.
  const body = imageUrl ? `${message}\n${imageUrl}` : message;
  await Share.share({ title, message: body });
}
