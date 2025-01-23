import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Image } from 'react-native';
import { View, Text } from '../../components/ui/Themed';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Profile, Post } from '../../types';
import PostCard from '../../components/ui/PostCard';
import FollowButton from '../../components/ui/FollowButton';

export default function UserProfile() {
  const { id } = useLocalSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchPosts();
      fetchStats();
    }
  }, [id]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profile:profiles(*)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }

  async function fetchStats() {
    try {
      const [followers, following, postsCount] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', id),
        supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', id),
        supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', id),
      ]);

      setStats({
        followers: followers.count || 0,
        following: following.count || 0,
        posts: postsCount.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  if (!profile) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: profile.avatar_url || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        
        <FollowButton 
          profileId={profile.id} 
          onFollowChange={() => fetchStats()}
        />
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>

      <View style={styles.posts}>
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onLike={() => fetchPosts()}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  posts: {
    padding: 10,
  },
});