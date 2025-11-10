import React from "react";
import { View, Text, Pressable, TextInput, Image, Platform, TextProps } from "react-native";
import { useTheme } from "./ThemeProvider";

type TTextProps = TextProps & {
  variant?: "h1" | "h2" | "body" | "small";
  muted?: boolean;
};

export function TText({ variant="body", muted=false, style, children, ...rest}: TTextProps) {
  const { typography, colors } = useTheme();
  const size = typography[variant];
  return (
    <Text
      {...rest} // ✅ allows numberOfLines, ellipsizeMode, etc.
      style={[
        {
          fontSize: size,
          color: muted ? colors.textMuted : colors.text,
          fontWeight: variant === "h1" || variant === "h2" ? "700" : "400",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function TButton({ title, onPress, color="primary", disabled=false }:{
  title: string; onPress: ()=>void; color?: "primary"|"secondary"|"danger"|"ghost"; disabled?: boolean;
}) {
  const { colors, radius, spacing } = useTheme();
  const palette = {
    primary: { bg: colors.blue, fg: "white" },
    secondary: { bg: colors.gold, fg: colors.text },
    danger: { bg: colors.red, fg: "white" },
    ghost: { bg: "transparent", fg: colors.blue },
  }[color];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: palette.bg,
        opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        borderWidth: color==="ghost"?1:0,
        borderColor: color==="ghost"?colors.blue: "transparent",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: Platform.OS === "ios" ? 0.25 : 0.2,
        shadowRadius: 4,
        elevation: 2,
      })}
    >
      <TText style={{ color: palette.fg, fontWeight: "700", textAlign: "center" }}>{title}</TText>
    </Pressable>
  );
}

export function Input(props: React.ComponentProps<typeof TextInput> & {error?: string}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={[{
          borderWidth: 1, borderColor: props.error? colors.red : colors.border,
          paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
          borderRadius: radius.md, backgroundColor: "white"
        }, props.style]}
      />
      {props.error ? <TText variant="small" style={{ color: colors.red }}>{props.error}</TText> : null}
    </View>
  );
}

export function Card({ children, style }:{ children: React.ReactNode; style?: any }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={[{
      backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md,
      shadowColor: colors.shadow, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset:{width:0,height:2}, elevation:3
    }, style]}>{children}</View>
  );
}

export function TabPill({ label, active=false, onPress }:{
  label: string; active?: boolean; onPress: ()=>void;
}) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: active ? colors.blue : "transparent",
      borderWidth: 1, borderColor: active ? colors.blue : colors.border
    }}>
      <TText style={{ color: active ? "white" : colors.blue, fontWeight: "700" }}>{label}</TText>
    </Pressable>
  );
}

export function Thumb({ uri }:{ uri: string }) {
  const { radius } = useTheme();
  return <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: "#eee" }} />;
}
