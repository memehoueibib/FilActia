// frontend/components/ui/Comments.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Alert,
} from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
 
type CommentsProps = {
  postId: string;
  initialCount?: number;
  onPress?: () => void;
};
 
export default function Comments({ postId, initialCount = 0, onPress }: CommentsProps) {
  const [count, setCount] = useState(initialCount);
    const [loading, setLoading] = useState(false);
    const [lastComment, setLastComment] = useState<{
    username: string;
    content: string;
    } | null>(null);
 
const { session } = useAuth();
const scaleAnim = useRef(new Animated.Value(1)).current;
const fadeAnim = useRef(new Animated.Value(0)).current;
 
useEffect(() => {
  setCount(initialCount);
  fetchLastComment();
  const subscription = subscribeToComments();
  return () => {
    subscription?.unsubscribe();
  };
}, [postId, initialCount]);
 
const fetchLastComment = async () => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        content,
        profile:profiles(username)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
 
    if (error) {
      if (error.code !== 'PGRST116') throw error; // PGRST116 = pas de résultat
    }
 
    if (data) {
      setLastComment({
        username: data.profile.username,
        content: data.content
      });
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  } catch (error) {
    console.error('Error fetching last comment:', error);
  }
};
 
const subscribeToComments = () => {
  return supabase
    .channel(`comments:${postId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'comments',
      filter: `post_id=eq.${postId}`,
    }, () => {
      fetchCommentsCount();
      fetchLastComment();
      animate();
    })
    .subscribe();
};
 
const fetchCommentsCount = async () => {
  try {
    const { count: newCount, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
 
    if (error) throw error;
    setCount(newCount || 0);
  } catch (error) {
    console.error('Error fetching comments count:', error);
  }
};
 
const animate = () => {
  Animated.sequence([
    Animated.spring(scaleAnim, {
      toValue: 1.2,
      useNativeDriver: true,
      speed: 50,
    }),
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }),
  ]).start();
};
 
const handlePress = () => {
  if (!session?.user) {
    Alert.alert(
      'Connexion requise',
      'Vous devez être connecté pour voir et ajouter des commentaires',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/(auth)/login') }
      ]
    );
    return;
  }
 
  if (onPress) {
    onPress();
  } else {
    router.push(`/comments/${postId}`);
  }
};
 
return (
  <View>
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={loading}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <FontAwesome
          name="comment-o"
          size={20}
          color={Colors.light.icon}
        />
      </Animated.View>
      {count > 0 && (
        <Text style={styles.count}>{count}</Text>
      )}
    </TouchableOpacity>
 
    {lastComment && (
      <Animated.View
        style={[
          styles.lastCommentContainer,
          { opacity: fadeAnim }
        ]}
      >
        <Text style={styles.lastCommentText} numberOfLines={1}>
          <Text style={styles.username}>{lastComment.username}</Text>
          {" "}
          {lastComment.content}
        </Text>
      </Animated.View>
    )}
  </View>
);
}
 
const styles = StyleSheet.create({
container: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 8,
},
count: {
  marginLeft: 5,
  fontSize: 14,
  color: Colors.light.icon,
},
lastCommentContainer: {
  marginTop: -5,
  paddingHorizontal: 8,
  paddingBottom: 8,
},
lastCommentText: {
  fontSize: 13,
  color: '#666',
},
username: {
  fontWeight: '600',
  color: '#333',
},
});