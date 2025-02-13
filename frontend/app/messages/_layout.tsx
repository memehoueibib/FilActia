// app/messages/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { Colors } from "@/constants/Colors";

export default function MessagesLayout() {
  return (
    <Stack 
      screenOptions={{
        headerStyle: { 
          backgroundColor: '#fff' 
        },
        headerTintColor: Colors.light.tint,
        headerShadowVisible: false,
        headerBackTitle: "Retour",
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: "Conversation",
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          headerTitle: "Nouveau message",
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}