import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

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
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(
    ref,
    () => ({
      postMessage: (msg: any) => {
        // Convert string payloads to objects so we always inject a real JS object
        const obj = typeof msg === "string" ? JSON.parse(msg) : msg;
        // JSON.stringify(obj) interpolated into JS source produces a valid object literal
        const js = `(function(){
  try {
    var data = ${JSON.stringify(obj)};
    window.dispatchEvent(new MessageEvent('message', { data: data }));
  } catch(e) {}
  true;
})();`;
        webViewRef.current?.injectJavaScript(js);
      },
    }),
    []
  );

  const handleMessage = (event: WebViewMessageEvent) => {
    if (onMessage) onMessage(event.nativeEvent.data);
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: htmlContent }}
      style={style}
      onMessage={handleMessage}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      allowFileAccess
      allowUniversalAccessFromFileURLs
      mixedContentMode="always"
    />
  );
});
