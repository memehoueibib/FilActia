// app/stories/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { Colors } from "@/constants/Colors";
 
export default function StoriesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.light.background,
        },
        headerTintColor: Colors.light.tint,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: "Story",
          presentation: 'modal',
          animation: 'fade',
          headerShown: false,
        }}
      />
 
      <Stack.Screen
        name="create"
        options={{
          headerTitle: "Nouvelle story",
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
 
      <Stack.Screen
        name="[id]/views"
        options={{
          headerTitle: "Vues",
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
 