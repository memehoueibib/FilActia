// frontend/components/ui/ProfileCard.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, Image, View as RNView, Platform } from 'react-native';
import { View, Text } from './Themed';
import { Profile } from '../../types';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import FollowButton from './FollowButton';
import { useAuth } from '../../context/AuthContext';

type ProfileCardProps = {
  profile: Profile;
  showFollow?: boolean;
};

export function ProfileCard({ profile, showFollow = true }: ProfileCardProps) {
  const { session } = useAuth();

  return (
    <RNView style={styles.card}>
      <TouchableOpacity
        style={styles.container}
        onPress={() => router.push(`/profile/${profile.id}`)}
      >
        <Image
          source={{
            uri:
              profile.avatar_url ||
              'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
          }}
          style={styles.avatar}
        />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.full_name}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{profile.username}
          </Text>
          {profile.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {profile.bio}
            </Text>
          )}
        </View>

        {showFollow && session?.user?.id !== profile.id && (
          <RNView style={styles.followContainer}>
            <FollowButton profileId={profile.id} />
          </RNView>
        )}
      </TouchableOpacity>
    </RNView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    marginVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  container: {
    flexDirection: 'row',
    padding: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  username: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: Colors.light.text,
    marginTop: 4,
    lineHeight: 18,
  },
  followContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },
});
