import React from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { View, Text } from './Themed';
import { Profile } from '../../types';
import { router } from 'expo-router';

type ProfileCardProps = {
  profile: Profile;
};

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/profile/${profile.id}`)}
    >
      <Image
        source={{ uri: profile.avatar_url || 'https://via.placeholder.com/60' }}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  info: {
    marginLeft: 15,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    marginTop: 5,
    color: '#444',
  },
});