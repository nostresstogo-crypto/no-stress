/**
 * shareWithImage
 * ──────────────
 * Shares a text message and, when an imageUrl is provided, attaches the photo
 * so the recipient sees it as an embedded image rather than a raw URL.
 *
 * Flow:
 * 1. Android — uses react-native-share (Share.open) which passes both the
 *    local image file AND the text message in a single ACTION_SEND intent.
 *    Messaging apps (WhatsApp, Telegram, …) display the photo inline together
 *    with the pre-filled caption.
 * 2. iOS — uses React Native's Share.share() with { url, message } which
 *    already handles image + text correctly via the native share sheet.
 * 3. Fallback (web / download failures) — Share.share() with the full text
 *    body and the image URL appended as a clickable link.
 */

import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import RNShare from "react-native-share";

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
        // Derive a safe file extension from the URL (default to jpg).
        const rawExt = imageUrl.split("?")[0].split(".").pop()?.toLowerCase();
        const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt ?? "")
          ? rawExt!
          : "jpg";
        const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
        const localUri = `${FileSystem.cacheDirectory}share_preview.${ext}`;

        const result = await FileSystem.downloadAsync(imageUrl, localUri);
        if (result.status === 200) {
          if (Platform.OS === "android") {
            // ── Android: react-native-share passes both the image file AND
            //    the message text in a single ACTION_SEND intent so apps
            //    like WhatsApp pre-fill the caption.
            await RNShare.open({
              title,
              message,
              url: result.uri,
              type: mimeType,
              failOnCancel: false,
            });
          } else {
            // ── iOS: Share.share with url + message works natively.
            await Share.share({ title, message, url: result.uri });
          }
          return;
        }
      }
    } catch (err: any) {
      // User dismissed the sheet (error.message contains "cancel" on some
      // RN-share versions) — treat as success; other errors fall through.
      const msg: string = typeof err?.message === "string" ? err.message.toLowerCase() : "";
      if (msg.includes("cancel") || msg.includes("dismiss") || err?.dismissedAction) {
        return;
      }
      // Image download / share failed — fall through to text-only sharing.
    }
  }

  // ── Text-only fallback ─────────────────────────────────────────────────
  // Append the image URL as a clickable link so recipients can still view
  // the photo even when the file-attachment path is unavailable.
  const body = imageUrl ? `${message}\n${imageUrl}` : message;
  await Share.share({ title, message: body });
}
