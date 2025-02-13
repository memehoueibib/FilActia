// services/NotificationService.ts
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  MESSAGE = 'message',
  FOLLOW_REQUEST = 'follow_request'
}

export interface Notification {
  id: string;
  type: NotificationType;
  recipient_id: string;
  sender_id: string;
  resource_type: 'post' | 'comment' | 'story' | 'message' | 'profile';
  resource_id?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
}

class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(userId: string): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        this.pushToken = tokenData.data;

        await this.savePushToken(userId);

        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      }

      this.subscribeToNotifications(userId);
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  private async savePushToken(userId: string): Promise<void> {
    if (!this.pushToken) return;

    try {
      await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token: this.pushToken,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  private subscribeToNotifications(userId: string): void {
    supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        payload => this.handleNewNotification(payload.new as Notification)
      )
      .subscribe();
  }

  private async handleNewNotification(notification: Notification): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      let title = 'Nouvelle notification';
      let body = '';

      switch (notification.type) {
        case NotificationType.LIKE:
          body = 'a aimé votre publication';
          break;
        case NotificationType.COMMENT:
          body = 'a commenté votre publication';
          break;
        case NotificationType.FOLLOW:
          body = 'a commencé à vous suivre';
          break;
        case NotificationType.MESSAGE:
          body = 'vous a envoyé un message';
          break;
        case NotificationType.FOLLOW_REQUEST:
          body = 'souhaite vous suivre';
          break;
      }

      if (notification.sender?.username) {
        body = `${notification.sender.username} ${body}`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: notification,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  }

  public async createNotification(
    type: NotificationType,
    senderId: string,
    recipientId: string,
    resourceType: 'post' | 'comment' | 'story' | 'message' | 'profile',
    resourceId?: string,
    message?: string
  ): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .insert({
          type,
          sender_id: senderId,
          recipient_id: recipientId,
          resource_type: resourceType,
          resource_id: resourceId,
          message,
          is_read: false
        });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  public async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  public async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  public async deleteOldNotifications(userId: string, days = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', userId)
        .lt('created_at', cutoffDate.toISOString());
    } catch (error) {
      console.error('Error deleting old notifications:', error);
    }
  }

  public async clearAllNotifications(userId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', userId);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}

export default NotificationService;