import { GraphQLContext, Booking, CreateBookingInput, BookingStatus } from '../types';
import { requireAuth } from '../middleware/auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const bookingResolvers = {
  Query: {
    booking: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Booking | null> => {
      requireAuth(context);
      
      const result = await query<Booking>(
        'SELECT * FROM bookings WHERE id = $1',
        [id]
      );
      
      return result[0] || null;
    },

    myBookings: async (_: any, { status }: { status?: BookingStatus }, context: GraphQLContext): Promise<Booking[]> => {
      const user = requireAuth(context);
      
      let queryText = 'SELECT * FROM bookings WHERE rider_id = $1';
      const values = [user.uid];
      
      if (status) {
        queryText += ' AND booking_status = $2';
        values.push(status);
      }
      
      queryText += ' ORDER BY created_at DESC';
      
      const result = await query<Booking>(queryText, values);
      
      return result;
    },

    tripBookings: async (_: any, { tripId }: { tripId: string }, context: GraphQLContext): Promise<Booking[]> => {
      requireAuth(context);
      
      const result = await query<Booking>(
        'SELECT * FROM bookings WHERE trip_id = $1 ORDER BY created_at DESC',
        [tripId]
      );
      
      return result;
    },
  },

  Mutation: {
    createBooking: async (_: any, { input }: { input: CreateBookingInput }, context: GraphQLContext): Promise<Booking> => {
      const user = requireAuth(context);
      
      // Calculate total amount (placeholder logic)
      const commissionRate = 0.1; // 10% commission
      const baseAmount = 100; // This would be calculated based on trip price and seats
      const totalAmount = baseAmount * input.seatsBooked;
      const commissionAmount = totalAmount * commissionRate;
      
      const result = await query<Booking>(
        `INSERT INTO bookings (id, trip_id, rider_id, seats_booked, total_amount, commission_amount, booking_status, payment_status, payment_method, pickup_location, pickup_coordinates, special_requests, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         RETURNING *`,
        [
          uuidv4(),
          input.tripId,
          user.uid,
          input.seatsBooked,
          totalAmount,
          commissionAmount,
          'pending',
          'pending',
          'paystack',
          input.pickupLocation || null,
          input.pickupCoordinates ? `POINT(${input.pickupCoordinates.longitude}, ${input.pickupCoordinates.latitude})` : null,
          input.specialRequests || null
        ]
      );
      
      if (!result[0]) {
        throw new Error('Failed to create booking');
      }
      
      logger.info('Booking created successfully', { userId: user.uid, bookingId: result[0].id });
      
      return result[0];
    },

    confirmBooking: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Booking> => {
      requireAuth(context);
      
      const result = await query<Booking>(
        `UPDATE bookings SET booking_status = 'confirmed' WHERE id = $1 RETURNING *`,
        [id]
      );
      
      if (!result[0]) {
        throw new Error('Booking not found');
      }
      
      return result[0];
    },

    cancelBooking: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Booking> => {
      const user = requireAuth(context);
      
      const result = await query<Booking>(
        `UPDATE bookings SET booking_status = 'cancelled' WHERE id = $1 AND rider_id = $2 RETURNING *`,
        [id, user.uid]
      );
      
      if (!result[0]) {
        throw new Error('Booking not found or unauthorized');
      }
      
      return result[0];
    },
  },

  Subscription: {
    bookingStatusUpdate: {
      // Placeholder for subscription resolver
      subscribe: () => {
        return null;
      },
    },

    newBookingForTrip: {
      // Placeholder for subscription resolver
      subscribe: () => {
        return null;
      },
    },
  },

  // Type resolvers
  Booking: {
    trip: async (parent: Booking) => {
      const result = await query(
        'SELECT * FROM trips WHERE id = $1',
        [parent.trip_id]
      );
      
      return result[0];
    },

    rider: async (parent: Booking) => {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [parent.rider_id]
      );
      
      return result[0];
    },

    payment: async (parent: Booking) => {
      const result = await query(
        'SELECT * FROM payments WHERE booking_id = $1',
        [parent.id]
      );
      
      return result[0] || null;
    },

    pickupCoordinates: (parent: Booking) => {
      if (!parent.pickup_coordinates) return null;
      
      // Parse PostgreSQL POINT type
      return {
        latitude: parent.pickup_coordinates.latitude || 0,
        longitude: parent.pickup_coordinates.longitude || 0,
      };
    },
  },
};
