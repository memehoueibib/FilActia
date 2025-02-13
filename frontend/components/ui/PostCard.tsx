// frontend/components/ui/PostCard.tsx
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Image, Platform, View as RNView } from 'react-native';
import { View, Text } from './Themed';
import { Post } from '@/types';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Likes from './Likes';

type Props = {
  post: Post;
  onRefresh?: () => void;
};

export default function PostCard({ post, onRefresh }: Props) {
  const { session } = useAuth();
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const isOwner = session?.user?.id === post.user_id;
  const formattedDate = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })
    : '';

  async function handleDelete() {
    if (!confirm('Voulez-vous vraiment supprimer cette publication ?')) return;
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Impossible de supprimer la publication');
    }
  }

  return (
    <View style={styles.card}>
      <RNView style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push(`/profile/${post.user_id}`)}
        >
          <Image
            source={{
              uri: post.profile?.avatar_url || 'https://via.placeholder.com/40'
            }}
            style={styles.avatar}
          />
          <RNView style={styles.userInfoText}>
            <Text style={styles.name}>{post.profile?.full_name}</Text>
            <Text style={styles.username}>@{post.profile?.username}</Text>
            <Text style={styles.time}>{formattedDate}</Text>
          </RNView>
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowOptions(!showOptions)}
            style={styles.optionsButton}
          >
            <FontAwesome name="ellipsis-v" size={20} color={Colors.light.icon} />
          </TouchableOpacity>
        )}
      </RNView>

      {showOptions && (
  <RNView style={styles.optionsMenu}>
    <TouchableOpacity
      style={styles.optionItem}
      onPress={() => {
        router.push(`/posts/edit/${post.id}`);
        setShowOptions(false);
      }}
    >
      <FontAwesome name="edit" size={16} color={Colors.light.icon} />
      <Text style={styles.optionText}>Modifier</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={styles.optionItem} 
      onPress={handleDelete}
    >
      <FontAwesome name="trash" size={16} color="#ff4444" />
      <Text style={[styles.optionText, { color: '#ff4444' }]}>
        Supprimer
      </Text>
    </TouchableOpacity>
  </RNView>
)}

      <Text style={styles.content}>{post.content}</Text>

      {post.file_url && (
        <Image
          source={{ uri: post.file_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      <RNView style={styles.actions}>
        <Likes postId={post.id} initialLikes={post?.likes_count || 0} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/comments/${post.id}`)}
        >
          <FontAwesome name="comment-o" size={20} color={Colors.light.icon} />
          {post.comments_count > 0 && (
            <Text style={styles.actionText}>{post.comments_count}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <FontAwesome name="share" size={20} color={Colors.light.icon} />
        </TouchableOpacity>
      </RNView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 15,
    margin: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userInfoText: {
    flex: 1,
    marginLeft: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  optionsButton: {
    padding: 5,
  },
  optionsMenu: {
    position: 'absolute',
    right: 10,
    top: 45,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 5,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  optionText: {
    marginLeft: 10,
    fontSize: 14,
  },
  content: {
    fontSize: 16,
    marginVertical: 10,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginVertical: 10,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 10,
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    padding: 5,
  },
  actionText: {
    marginLeft: 5,
    color: Colors.light.icon,
    fontSize: 14,
  },
});