import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";

interface Props {
  htmlContent: string;
  style?: StyleProp<ViewStyle>;
  onMessage?: (data: string) => void;
}

export interface MapWebViewHandle {
  postMessage: (msg: any) => void;
}

export const MapWebView = forwardRef<MapWebViewHandle, Props>(function MapWebView(
  { htmlContent, style, onMessage },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      postMessage: (msg: any) => {
        const data = typeof msg === "string" ? JSON.parse(msg) : msg;
        iframeRef.current?.contentWindow?.postMessage(data, "*");
      },
    }),
    []
  );

  useEffect(() => {
    if (!onMessage) return;
    const handler = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow) {
        onMessage(event.data);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onMessage]);

  const flatStyle = style as React.CSSProperties | undefined;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={htmlContent}
      style={{
        border: "none",
        width: "100%",
        height: "100%",
        display: "block",
        ...(flatStyle || {}),
      }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
});
