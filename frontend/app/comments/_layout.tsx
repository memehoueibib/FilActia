// app/comments/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { Colors } from "@/constants/Colors";

export default function CommentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: Colors.light.tint,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: "Commentaires",
          presentation: 'modal',
          animationDuration: 200,
        }}
      />
    </Stack>
  );
}