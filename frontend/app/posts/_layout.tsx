// app/posts/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { Colors } from "@/constants/Colors";

export default function PostsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: "Publication",
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          headerTitle: "Nouvelle publication",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          headerTitle: "Modifier la publication",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}