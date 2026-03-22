import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

interface Props {
  htmlContent: string;
  style?: StyleProp<ViewStyle>;
  onMessage?: (data: string) => void;
}

export function MapWebView({ style }: Props) {
  return <View style={style} />;
}
