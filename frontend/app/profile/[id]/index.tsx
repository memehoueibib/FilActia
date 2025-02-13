// app/profile/[id]/index.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Image, View } from 'react-native';
import { Text } from '@/components/ui/Themed';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Profile, Post } from '@/types';
import FollowButton from '@/components/ui/FollowButton';
import { Colors } from '@/constants/Colors';
import PostCard from '@/components/ui/PostCard';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function UserProfile() {
  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchFollowersCount();
      fetchFollowingCount();
      fetchPosts();
    }
  }, [id]);

  async function fetchProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (!error) setProfile(data);
  }

  async function fetchFollowersCount() {
    const { count } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', id);
    setFollowersCount(count || 0);
  }

  async function fetchFollowingCount() {
    const { count } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', id);
    setFollowingCount(count || 0);
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profile:profiles(*)')
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    setPosts(data || []);
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: profile.avatar_url || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile.full_name || 'No name'}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

        {/* Bouton de follow/unfollow */}
        <FollowButton
          profileId={profile.id}
          onFollowChange={() => {
            fetchFollowersCount();
          }}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          onPress={() => {
            // Voir la liste des followers
            // => push /profile/[id]/followers
          }}
          style={styles.statItem}
        >
          <Text style={styles.statNumber}>{followersCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            // Voir la liste des followings
            // => push /profile/[id]/following
          }}
          style={styles.statItem}
        >
          <Text style={styles.statNumber}>{followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
      </View>

      {/* Liste de posts */}
      <View style={{ padding: 10 }}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  name: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  username: { fontSize: 16, color: '#666', marginTop: 4 },
  bio: { fontSize: 14, textAlign: 'center', marginTop: 10 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1, borderTopColor: '#eee',
    borderBottomWidth: 1, borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: '600' },
  statLabel: { fontSize: 14, color: '#666' },
});
