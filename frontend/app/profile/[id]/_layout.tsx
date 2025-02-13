// app/profile/[id]/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function ProfileIdLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="followers"
        options={{ title: "Followers" }}
      />
      <Stack.Screen
        name="following"
        options={{ title: "Following" }}
      />
      {/* Edit-post (si besoin) */}
      <Stack.Screen
        name="edit-post"
        options={{ title: "Edit Post" }}
      />
    </Stack>
  );
}
