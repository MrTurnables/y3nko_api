import { GraphQLContext, Payment, InitializePaymentInput } from '../types';
import { requireAuth } from '../middleware/auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const paymentResolvers = {
  Query: {
    payment: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Payment | null> => {
      requireAuth(context);
      
      const result = await query<Payment>(
        'SELECT * FROM payments WHERE id = $1',
        [id]
      );
      
      return result[0] || null;
    },

    paymentHistory: async (_: any, { first, after }: { first?: number; after?: string }, context: GraphQLContext): Promise<Payment[]> => {
      const user = requireAuth(context);
      
      // Join with bookings to get user's payments
      const result = await query<Payment>(
        `SELECT p.* FROM payments p 
         JOIN bookings b ON p.booking_id = b.id 
         WHERE b.rider_id = $1 
         ORDER BY p.created_at DESC 
         LIMIT $2`,
        [user.uid, first || 10]
      );
      
      return result;
    },
  },

  Mutation: {
    initializePayment: async (_: any, { input }: { input: InitializePaymentInput }, context: GraphQLContext): Promise<Payment> => {
      const user = requireAuth(context);
      
      // Get booking details
      const bookingResult = await query(
        'SELECT * FROM bookings WHERE id = $1 AND rider_id = $2',
        [input.bookingId, user.uid]
      );
      
      if (!bookingResult[0]) {
        throw new Error('Booking not found or unauthorized');
      }
      
      const booking = bookingResult[0];
      const paystackReference = `yenko_${Date.now()}_${uuidv4().substring(0, 8)}`;
      
      // Create payment record
      const result = await query<Payment>(
        `INSERT INTO payments (id, booking_id, amount, payment_method, paystack_reference, payment_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [
          uuidv4(),
          input.bookingId,
          booking.total_amount,
          input.paymentMethod,
          paystackReference,
          'pending'
        ]
      );
      
      if (!result[0]) {
        throw new Error('Failed to create payment');
      }
      
      // Here you would integrate with Paystack API to initialize payment
      // For now, we'll just log the action
      logger.info('Payment initialized', { 
        userId: user.uid, 
        paymentId: result[0].id,
        reference: paystackReference,
        amount: booking.total_amount
      });
      
      return result[0];
    },

    verifyPayment: async (_: any, { reference }: { reference: string }, context: GraphQLContext): Promise<Payment> => {
      requireAuth(context);
      
      // Here you would verify payment with Paystack API
      // For now, we'll just update the payment status
      const result = await query<Payment>(
        `UPDATE payments SET 
         payment_status = 'completed',
         paystack_transaction_id = $1,
         gateway_response = $2
         WHERE paystack_reference = $3 
         RETURNING *`,
        [
          `txn_${Date.now()}`, // Mock transaction ID
          JSON.stringify({ status: 'success', message: 'Payment verified' }), // Mock response
          reference
        ]
      );
      
      if (!result[0]) {
        throw new Error('Payment not found');
      }
      
      // Update booking payment status
      await query(
        `UPDATE bookings SET payment_status = 'paid' WHERE id = $1`,
        [result[0].booking_id]
      );
      
      logger.info('Payment verified successfully', { 
        paymentId: result[0].id,
        reference 
      });
      
      return result[0];
    },

    processRefund: async (_: any, { paymentId }: { paymentId: string }, context: GraphQLContext): Promise<Payment> => {
      requireAuth(context);
      
      // Here you would process refund with Paystack API
      // For now, we'll just update the payment status
      const result = await query<Payment>(
        `UPDATE payments SET payment_status = 'refunded' WHERE id = $1 RETURNING *`,
        [paymentId]
      );
      
      if (!result[0]) {
        throw new Error('Payment not found');
      }
      
      // Update booking payment status
      await query(
        `UPDATE bookings SET payment_status = 'refunded' WHERE id = $1`,
        [result[0].booking_id]
      );
      
      logger.info('Refund processed successfully', { paymentId });
      
      return result[0];
    },
  },

  // Type resolvers
  Payment: {
    booking: async (parent: Payment) => {
      const result = await query(
        'SELECT * FROM bookings WHERE id = $1',
        [parent.booking_id]
      );
      
      return result[0];
    },
  },
};
