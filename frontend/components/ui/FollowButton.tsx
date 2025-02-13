// frontend/components/ui/FollowButton.tsx
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from './Themed'; // ou votre composant
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';

type FollowButtonProps = {
  profileId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'small' | 'normal';
};

export default function FollowButton({
  profileId,
  initialIsFollowing = false,
  onFollowChange,
  size = 'normal'
}: FollowButtonProps) {
  const { session } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialIsFollowing && session?.user) {
      checkFollowStatus();
    }
  }, [profileId, session]);

  async function checkFollowStatus() {
    if (!session?.user) return;
    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', profileId)
        .single();
      setIsFollowing(!!data);
    } catch (err) {
      // Not found is normal => no follow
    }
  }

  async function toggleFollow() {
    if (!session?.user || loading) return;

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', profileId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({ follower_id: session.user.id, following_id: profileId });
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setLoading(false);
    }
  }

  // Empêcher de se suivre soi-même
  if (session?.user?.id === profileId) return null;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFollowing ? styles.followingButton : styles.followButton,
        size === 'small' && styles.smallButton,
        loading && { opacity: 0.6 },
      ]}
      onPress={toggleFollow}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? Colors.light.tint : '#fff'}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isFollowing ? styles.followingText : styles.followText,
          ]}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallButton: {
    minWidth: 60,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  followButton: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  followingButton: {
    backgroundColor: '#fff',
    borderColor: Colors.light.tint,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  followText: {
    color: '#fff',
  },
  followingText: {
    color: Colors.light.tint,
  },
});
