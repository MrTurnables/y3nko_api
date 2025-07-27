import { GraphQLContext, Notification } from '../types';
import { requireAuth } from '../middleware/auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export const notificationResolvers = {
  Query: {
    myNotifications: async (_: any, { unreadOnly }: { unreadOnly?: boolean }, context: GraphQLContext): Promise<Notification[]> => {
      const user = requireAuth(context);
      
      let queryText = 'SELECT * FROM notifications WHERE user_id = $1';
      const values = [user.uid];
      
      if (unreadOnly) {
        queryText += ' AND is_read = false';
      }
      
      queryText += ' ORDER BY created_at DESC';
      
      const result = await query<Notification>(queryText, values);
      
      return result;
    },
  },

  Mutation: {
    markNotificationAsRead: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Notification> => {
      const user = requireAuth(context);
      
      const result = await query<Notification>(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, user.uid]
      );
      
      if (!result[0]) {
        throw new Error('Notification not found or unauthorized');
      }
      
      return result[0];
    },

    markAllNotificationsAsRead: async (_: any, __: any, context: GraphQLContext): Promise<boolean> => {
      const user = requireAuth(context);
      
      const result = await query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
        [user.uid]
      );
      
      logger.info('All notifications marked as read', { 
        userId: user.uid, 
        count: result.length 
      });
      
      return true;
    },
  },

  Subscription: {
    newNotification: {
      // Placeholder for subscription resolver
      subscribe: () => {
        return null;
      },
    },
  },

  // Type resolvers
  Notification: {
    user: async (parent: Notification) => {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [parent.user_id]
      );
      
      return result[0];
    },
  },
};
