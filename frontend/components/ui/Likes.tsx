// frontend/components/ui/Likes.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { Text } from './Themed';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
 
type LikesProps = {
  postId: string;
  initialLikes?: number;
};
 
export default function Likes({ postId, initialLikes = 0 }: LikesProps) {
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { session } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current;
 
  useEffect(() => {
    if (session?.user) {
      checkLikeStatus();
    }
  }, [session, postId]);
 
  useEffect(() => {
    const subscription = supabase
      .channel(`likes:${postId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'likes',
        filter: `post_id=eq.${postId}`,
      }, () => {
        fetchLikesCount();
      })
      .subscribe();
 
    return () => {
      subscription.unsubscribe();
    };
  }, [postId]);
 
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
 
  async function checkLikeStatus() {
    try {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', session?.user.id)
        .single();
 
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  }
 
  async function fetchLikesCount() {
    try {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
 
      setLikesCount(count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  }
 
  async function toggleLike() {
    if (!session?.user) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour aimer une publication',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }
 
    if (loading) return;
 
    try {
      setLoading(true);
      animate();
 
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', session.user.id);
 
        if (error) throw error;
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{
            post_id: postId,
            user_id: session.user.id,
            created_at: new Date().toISOString(),
          }]);
 
        if (error) throw error;
        setLikesCount(prev => prev + 1);
      }
 
      setIsLiked(!isLiked);
 
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Erreur', "Impossible de mettre à jour le like");
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <TouchableOpacity
      onPress={toggleLike}
      style={styles.container}
      disabled={loading}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <FontAwesome
          name={isLiked ? 'heart' : 'heart-o'}
          size={20}
          color={isLiked ? '#e74c3c' : Colors.light.icon}
        />
      </Animated.View>
      {likesCount > 0 && (
        <Text style={[styles.count, isLiked && styles.likedCount]}>
          {likesCount}
        </Text>
      )}
    </TouchableOpacity>
  );
}
 
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  count: {
    marginLeft: 5,
    fontSize: 14,
    color: Colors.light.icon,
  },
  likedCount: {
    color: '#e74c3c',
    fontWeight: '500',
  },
});