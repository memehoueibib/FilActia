
// app/stories/[id]/views.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
 
export default function StoryViewsPage() {
  const { id } = useLocalSearchParams();
  const [views, setViews] = useState([]);
 
  useEffect(() => {
    fetchViews();
  }, []);
 
  async function fetchViews() {
    const { data, error } = await supabase
      .from('story_views')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('story_id', id);
    if (!error) {
      setViews(data);
    }
  }
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vues de la story</Text>
      {views.map((v) => (
        <Text key={v.id}>
          {v.profile?.username}
        </Text>
      ))}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 10 },
});