// app/_layout.tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { StatusBar } from "expo-status-bar";
import React from "react";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AuthProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: "#0a7ea4",
            headerTitleStyle: { fontWeight: "bold" },
          }}
        >
          {/* Routes principales */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />

          {/* Posts */}
          <Stack.Screen
            name="posts/create"
            options={{
              presentation: "modal",
              headerTitle: "Nouvelle publication",
            }}
          />
          <Stack.Screen
            name="posts/edit/[id]"
            options={{
              presentation: "modal",
              headerTitle: "Modifier la publication",
            }}
          />

          {/* Messages */}
          <Stack.Screen
            name="messages"
            options={{
              headerTitle: "Messages",
            }}
          />
          <Stack.Screen
            name="messages/[id]"
            options={{
              headerTitle: "Conversation",
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="messages/new"
            options={{
              headerTitle: "Nouveau message",
              presentation: "modal",
            }}
          />

          {/* Comments */}
          <Stack.Screen
            name="comments/[id]"
            options={{
              headerTitle: "Commentaires",
              presentation: "modal",
            }}
          />

          {/* Profile */}
          <Stack.Screen
            name="profile/[id]"
            options={{
              headerTitle: "Profil",
            }}
          />
          <Stack.Screen
            name="profile/edit"
            options={{
              headerTitle: "Modifier le profil",
            }}
          />

          {/* Stories */}
          <Stack.Screen
            name="stories/[id]"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="stories/create"
            options={{
              headerTitle: "Nouvelle story",
              presentation: "modal",
            }}
          />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}