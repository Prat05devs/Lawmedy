import React, { useState } from "react";
import { Pressable as NativePressable, type PressableProps, type PressableStateCallbackType } from "react-native";

// NativeWind's Pressable drops a style given as a function on iOS and Android (the web build is
// fine), which left cards and buttons unstyled on phones. This keeps its own pressed state and
// hands NativeWind a plain style instead.
export function Pressable({ style, children, onPressIn, onPressOut, ...rest }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const state: PressableStateCallbackType = { pressed };
  return (
    <NativePressable
      {...rest}
      onPressIn={(e) => { setPressed(true); onPressIn?.(e); }}
      onPressOut={(e) => { setPressed(false); onPressOut?.(e); }}
      style={typeof style === "function" ? style(state) : style}
    >
      {typeof children === "function" ? children(state) : children}
    </NativePressable>
  );
}
