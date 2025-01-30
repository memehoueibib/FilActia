import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { View } from '../../components/ui/Themed';
import PostCard from '../../components/ui/PostCard';
import { supabase } from '../../lib/supabase';
import { Post } from '../../types';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike(postId: string) {
    // Implement like functionality
  }

  async function handleComment(postId: string) {
    // Implement comment functionality
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={() => handleLike(item.id)}
            onComment={() => handleComment(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={fetchPosts}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});