// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from "expo-router";
import { useColorScheme, View, Platform } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";  // Correction de l'import
import { Colors } from "../../constants/Colors";
import BlurTabBarBackground from "../../components/ui/BlurTabBarBackground";
import { LinearGradient } from 'expo-linear-gradient';
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const TabBarBackground = () => {
    if (Platform.OS === 'ios') {
      return BlurTabBarBackground;
    }
    return () => (
      <LinearGradient
        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.95)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tint,
        tabBarInactiveTintColor: Colors[theme].tabIconDefault,
        tabBarBackground: TabBarBackground(),
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + insets.bottom,
          backgroundColor: 'transparent',
          paddingBottom: insets.bottom,
          paddingTop: 5,
        },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: Colors[theme].background,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <View style={[
              styles.iconContainer,
              { backgroundColor: color === Colors[theme].tint ? `${color}15` : 'transparent' }
            ]}>
              <FontAwesome5 name="home" size={size - 2} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorer",
          tabBarIcon: ({ color, size }) => (
            <View style={[
              styles.iconContainer,
              { backgroundColor: color === Colors[theme].tint ? `${color}15` : 'transparent' }
            ]}>
              <FontAwesome5 name="search" size={size - 2} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          href: null,
          title: "Publier",
          tabBarIcon: ({ color, size }) => (
            <View style={[
              styles.createPostButton,
              { backgroundColor: Colors[theme].tint }
            ]}>
              <FontAwesome5 name="plus" size={size - 2} color="#fff" />
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.push("/posts/create");
          },
        })}
      />


<Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => (
            <View style={[
              styles.iconContainer,
              { backgroundColor: color === Colors.light.tint ? `${color}15` : 'transparent' }
            ]}>
              <FontAwesome5 name="envelope" size={size} color={color} />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <View style={[
              styles.iconContainer,
              { backgroundColor: color === Colors[theme].tint ? `${color}15` : 'transparent' }
            ]}>
              <FontAwesome5 name="bell" size={size - 2} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <View style={[
              styles.iconContainer,
              { backgroundColor: color === Colors[theme].tint ? `${color}15` : 'transparent' }
            ]}>
              <FontAwesome5 name="user" size={size - 2} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = {
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
};