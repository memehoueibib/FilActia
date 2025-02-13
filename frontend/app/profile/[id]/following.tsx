// app/profile/[id]/following.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Themed';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Colors } from '@/constants/Colors';
import ProfileCard from '@/components/ui/ProfileCard';

export default function FollowingScreen() {
  const { id } = useLocalSearchParams();
  const [following, setFollowing] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowing();
  }, [id]);

  async function fetchFollowing() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following:profiles(*)
        `)
        .eq('follower_id', id);

      if (error) throw error;
      const mapped = data.map((row: any) => row.following);
      setFollowing(mapped);
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={following}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProfileCard profile={item} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text>Aucun abonnement</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
