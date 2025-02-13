// app/(tabs)/notifications.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Text } from '../../components/ui/Themed';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationWithRelations } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const fetchNotifications = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey(*),
          post:posts(*),
          comment:comments(*),
          story:stories(*)
        `)
        .eq('recipient_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      
      // Vérifier s'il y a des notifications non lues
      setHasUnread(data?.some(notification => !notification.is_read) || false);

      // Marquer toutes les notifications comme lues
      if (data?.some(notification => !notification.is_read)) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('recipient_id', session.user.id)
          .eq('is_read', false);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Souscrire aux nouvelles notifications
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${session?.user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as NotificationWithRelations, ...prev]);
          setHasUnread(true);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = (notification: NotificationWithRelations) => {
    switch (notification.type) {
      case 'follow':
      case 'follow_request':
        router.push(`/profile/${notification.sender?.id}`);
        break;
      case 'like':
      case 'comment':
        if (notification.post?.id) {
          router.push(`/posts/${notification.post.id}`);
        }
        break;
      case 'message':
        if (notification.resource_id) {
          router.push(`/messages/${notification.resource_id}`);
        }
        break;
      case 'story_mention':
      case 'story_view':
        if (notification.story?.id) {
          router.push(`/stories/${notification.story.id}`);
        }
        break;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return 'user-plus';
      case 'like':
        return 'heart';
      case 'comment':
        return 'comment';
      case 'mention':
        return 'at';
      case 'message':
        return 'envelope';
      case 'story_mention':
        return 'camera';
      case 'story_view':
        return 'eye';
      case 'follow_request':
        return 'user-circle';
      default:
        return 'bell';
    }
  };

  const renderNotification = ({ item }: { item: NotificationWithRelations }) => {
    const iconName = getNotificationIcon(item.type);
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          isUnread && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <Image
          source={{ 
            uri: item.sender?.avatar_url || 'https://via.placeholder.com/40'
          }}
          style={styles.avatar}
        />

        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.username}>{item.sender?.username}</Text>
            {' '}
            {item.message}
          </Text>

          <View style={styles.notificationFooter}>
            <FontAwesome
              name={iconName}
              size={12}
              color={Colors.light.icon}
              style={styles.typeIcon}
            />
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </Text>
          </View>
        </View>

        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.tint}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <FontAwesome
              name="bell-o"
              size={48}
              color={Colors.light.icon}
            />
            <Text style={styles.emptyText}>
              Aucune notification pour le moment
            </Text>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyList
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  unreadNotification: {
    backgroundColor: '#f8f8ff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 10,
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  username: {
    fontWeight: '600',
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typeIcon: {
    marginRight: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});