import { GraphQLContext, Review } from '../types';
import { requireAuth } from '../middleware/auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const reviewResolvers = {
  Query: {
    userReviews: async (_: any, { userId, first, after }: { userId: string; first?: number; after?: string }, context: GraphQLContext): Promise<Review[]> => {
      requireAuth(context);
      
      const result = await query<Review>(
        `SELECT * FROM reviews WHERE reviewee_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, first || 10]
      );
      
      return result;
    },
  },

  Mutation: {
    createReview: async (_: any, { bookingId, rating, comment }: { bookingId: string; rating: number; comment?: string }, context: GraphQLContext): Promise<Review> => {
      const user = requireAuth(context);
      
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      
      // Get booking details to determine reviewee
      const bookingResult = await query(
        `SELECT b.*, t.driver_id FROM bookings b 
         JOIN trips t ON b.trip_id = t.id 
         WHERE b.id = $1 AND (b.rider_id = $2 OR t.driver_id = $2)`,
        [bookingId, user.uid]
      );
      
      if (!bookingResult[0]) {
        throw new Error('Booking not found or unauthorized');
      }
      
      const booking = bookingResult[0];
      
      // Determine reviewee (if user is rider, reviewee is driver, and vice versa)
      const revieweeId = booking.rider_id === user.uid ? booking.driver_id : booking.rider_id;
      
      // Check if review already exists
      const existingReview = await query(
        'SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
        [bookingId, user.uid]
      );
      
      if (existingReview[0]) {
        throw new Error('Review already exists for this booking');
      }
      
      // Create review
      const result = await query<Review>(
        `INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [
          uuidv4(),
          bookingId,
          user.uid,
          revieweeId,
          rating,
          comment || null
        ]
      );
      
      // Update driver's average rating if reviewee is a driver
      if (booking.rider_id === user.uid) {
        await query(
          `UPDATE driver_profiles SET 
           average_rating = (
             SELECT AVG(rating)::DECIMAL(3,2) 
             FROM reviews 
             WHERE reviewee_id = $1
           )
           WHERE user_id = $1`,
          [revieweeId]
        );
      }
      
      if (!result[0]) {
        throw new Error('Failed to create review');
      }
      
      logger.info('Review created successfully', { 
        userId: user.uid, 
        reviewId: result[0].id,
        rating 
      });
      
      return result[0];
    },
  },

  // Type resolvers
  Review: {
    booking: async (parent: Review) => {
      const result = await query(
        'SELECT * FROM bookings WHERE id = $1',
        [parent.booking_id]
      );
      
      return result[0];
    },

    reviewer: async (parent: Review) => {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [parent.reviewer_id]
      );
      
      return result[0];
    },

    reviewee: async (parent: Review) => {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [parent.reviewee_id]
      );
      
      return result[0];
    },
  },
};
