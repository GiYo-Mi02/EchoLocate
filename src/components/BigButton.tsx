// src/components/BigButton.tsx — Oversized accessible button
//
// Constraint: App must be usable with a cracked/dim screen.
// - Minimum 64dp touch target
// - High contrast colors
// - Haptic feedback on press
// - Large readable text

import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { UI } from "../constants";

interface BigButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string; // Emoji icon (no icon library needed)
  variant?: "primary" | "danger" | "success" | "warning";
}

const VARIANT_COLORS: Record<string, string> = {
  primary: UI.COLORS.primary,
  danger: UI.COLORS.danger,
  success: UI.COLORS.success,
  warning: UI.COLORS.warning,
};

export const BigButton: React.FC<BigButtonProps> = ({
  title,
  onPress,
  color,
  textColor = "#ffffff",
  disabled = false,
  style,
  icon,
  variant = "primary",
}) => {
  const bgColor = color || VARIANT_COLORS[variant];

  const handlePress = async () => {
    // Haptic feedback — critical for cracked-screen usability
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: disabled ? UI.COLORS.textDim : bgColor },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: UI.MIN_TAP_TARGET,
    minWidth: UI.MIN_TAP_TARGET,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    // Elevated for visibility on dim screens
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  icon: {
    fontSize: 24,
  },
  text: {
    fontSize: UI.LARGE_FONT,
    fontWeight: "700",
    textAlign: "center",
  },
});
