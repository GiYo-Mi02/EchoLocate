// src/navigation/AppNavigator.tsx — Bottom tab navigation
//
// Uses @react-navigation/bottom-tabs with large tab targets
// for cracked/dim screen usability. Dark theme throughout.

import React from "react";
import { Text, StyleSheet, Platform } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
import { PeersScreen } from "../screens/PeersScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { UI } from "../constants";
import type { RootTabParamList } from "../types";

const Tab = createBottomTabNavigator<RootTabParamList>();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: UI.COLORS.accent,
    background: UI.COLORS.background,
    card: UI.COLORS.surface,
    text: UI.COLORS.text,
    border: UI.COLORS.primary,
    notification: UI.COLORS.danger,
  },
};

const TAB_ICONS: Record<string, string> = {
  Home: "🏠",
  Map: "🗺️",
  Peers: "👥",
  Settings: "⚙️",
};

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 28 : 22 }}>
              {TAB_ICONS[route.name]}
            </Text>
          ),
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabLabel,
                { color: focused ? UI.COLORS.accent : UI.COLORS.textDim },
              ]}
            >
              {route.name}
            </Text>
          ),
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Peers" component={PeersScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: UI.COLORS.surface,
    borderTopColor: UI.COLORS.primary,
    borderTopWidth: 1,
    // Large tab bar for big touch targets (constraint: cracked/dim screen)
    height: Platform.OS === "ios" ? 90 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
  },
  tabItem: {
    minHeight: UI.MIN_TAP_TARGET,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
