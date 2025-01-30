import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { View, Text } from '../../components/ui/Themed';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
  id: string;
  type: 'like' | 'comment' | 'follow';
  actor: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  post_id?: string;
  created_at: string;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session]);

  async function fetchNotifications() {
    try {
      const likesPromise = supabase
        .from('likes')
        .select('*, profiles!likes_user_id_fkey(id, username, avatar_url), posts!inner(*)')
        .eq('posts.user_id', session?.user.id)
        .neq('user_id', session?.user.id)
        .order('created_at', { ascending: false });

      const commentsPromise = supabase
        .from('comments')
        .select('*, profiles!comments_user_id_fkey(id, username, avatar_url), posts!inner(*)')
        .eq('posts.user_id', session?.user.id)
        .neq('user_id', session?.user.id)
        .order('created_at', { ascending: false });

      const followsPromise = supabase
        .from('follows')
        .select('*, profiles!follows_follower_id_fkey(id, username, avatar_url)')
        .eq('following_id', session?.user.id)
        .order('created_at', { ascending: false });

      const [likes, comments, follows] = await Promise.all([
        likesPromise,
        commentsPromise,
        followsPromise
      ]);

      const formattedNotifications: Notification[] = [
        ...(likes.data?.map(like => ({
          id: like.id,
          type: 'like' as const,
          actor: like.profiles,
          post_id: like.post_id,
          created_at: like.created_at
        })) || []),
        ...(comments.data?.map(comment => ({
          id: comment.id,
          type: 'comment' as const,
          actor: comment.profiles,
          post_id: comment.post_id,
          created_at: comment.created_at
        })) || []),
        ...(follows.data?.map(follow => ({
          id: follow.id,
          type: 'follow' as const,
          actor: follow.profiles,
          created_at: follow.created_at
        })) || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderNotification({ item }: { item: Notification }) {
    const handlePress = () => {
      if (item.type === 'follow') {
        router.push(`/profile/${item.actor.id}`);
      } else if (item.post_id) {
        router.push(`/post/${item.post_id}`);
      }
    };

    return (
      <TouchableOpacity style={styles.notification} onPress={handlePress}>
        <Image
          source={{ uri: item.actor.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View style={styles.content}>
          <Text style={styles.username}>{item.actor.username}</Text>
          <Text style={styles.message}>
            {item.type === 'like' && 'liked your post'}
            {item.type === 'comment' && 'commented on your post'}
            {item.type === 'follow' && 'started following you'}
          </Text>
          <Text style={styles.time}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <FlatList
      data={notifications}
      renderItem={renderNotification}
      keyExtractor={(item) => item.id}
      refreshing={loading}
      onRefresh={fetchNotifications}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  notification: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    marginLeft: 15,
  },
  username: {
    fontWeight: 'bold',
  },
  message: {
    color: '#666',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});