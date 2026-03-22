import React, { useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

interface Props {
  htmlContent: string;
  style?: StyleProp<ViewStyle>;
  onMessage?: (data: string) => void;
}

export function MapWebView({ htmlContent, style, onMessage }: Props) {
  const webViewRef = useRef<WebView>(null);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (onMessage) {
      onMessage(event.nativeEvent.data);
    }
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
}
