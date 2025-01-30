import React from 'react';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { View, Text } from './Themed';
import { Post } from '../../types';
import { FontAwesome } from '@expo/vector-icons';

type PostCardProps = {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
};

export default function PostCard({ post, onLike, onComment }: PostCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image
          source={{ uri: post.profile?.avatar_url || 'https://via.placeholder.com/40' }}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <Text style={styles.name}>{post.profile?.full_name}</Text>
          <Text style={styles.username}>@{post.profile?.username}</Text>
        </View>
      </View>
      
      <Text style={styles.content}>{post.content}</Text>
      
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={onLike}>
          <FontAwesome name="heart-o" size={20} color="#666" />
          <Text style={styles.actionText}>{post.likes_count || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.action} onPress={onComment}>
          <FontAwesome name="comment-o" size={20} color="#666" />
          <Text style={styles.actionText}>{post.comments_count || 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    marginLeft: 10,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  username: {
    color: '#666',
    fontSize: 14,
  },
  content: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 5,
    color: '#666',
  },
});