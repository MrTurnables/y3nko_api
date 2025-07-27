import { GraphQLContext, Trip, TripConnection, CreateTripInput, TripSearchInput, TripStatus } from '../types';
import { requireAuth } from '../middleware/auth';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const tripResolvers = {
  Query: {
    trips: async (_: any, args: any, context: GraphQLContext): Promise<TripConnection> => {
      // Placeholder implementation
      return {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: undefined,
          endCursor: undefined,
        },
        totalCount: 0,
      };
    },

    trip: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Trip | null> => {
      requireAuth(context);
      
      const result = await query<Trip>(
        'SELECT * FROM trips WHERE id = $1',
        [id]
      );
      
      return result[0] || null;
    },

    myTrips: async (_: any, { status }: { status?: TripStatus }, context: GraphQLContext): Promise<Trip[]> => {
      const user = requireAuth(context);
      
      let queryText = 'SELECT * FROM trips WHERE driver_id = $1';
      const values = [user.uid];
      
      if (status) {
        queryText += ' AND trip_status = $2';
        values.push(status);
      }
      
      queryText += ' ORDER BY created_at DESC';
      
      const result = await query<Trip>(queryText, values);
      
      return result;
    },
  },

  Mutation: {
    createTrip: async (_: any, { input }: { input: CreateTripInput }, context: GraphQLContext): Promise<Trip> => {
      const user = requireAuth(context);
      
      const result = await query<Trip>(
        `INSERT INTO trips (id, driver_id, origin_city, destination_city, origin_coordinates, destination_coordinates, departure_time, available_seats, price_per_seat, trip_status, trip_type, return_departure_time, description, created_at)
         VALUES ($1, $2, $3, $4, POINT($5, $6), POINT($7, $8), $9, $10, $11, $12, $13, $14, $15, NOW())
         RETURNING *`,
        [
          uuidv4(),
          user.uid,
          input.originCity,
          input.destinationCity,
          input.originCoordinates.longitude,
          input.originCoordinates.latitude,
          input.destinationCoordinates.longitude,
          input.destinationCoordinates.latitude,
          input.departureTime,
          input.availableSeats,
          input.pricePerSeat,
          'scheduled',
          input.tripType,
          input.returnDepartureTime || null,
          input.description || null
        ]
      );
      
      if (!result[0]) {
        throw new Error('Failed to create trip');
      }
      
      logger.info('Trip created successfully', { userId: user.uid, tripId: result[0].id });
      
      return result[0];
    },

    updateTrip: async (_: any, { id, input }: { id: string; input: CreateTripInput }, context: GraphQLContext): Promise<Trip> => {
      const user = requireAuth(context);
      
      // Placeholder implementation
      const result = await query<Trip>(
        'SELECT * FROM trips WHERE id = $1 AND driver_id = $2',
        [id, user.uid]
      );
      
      if (!result[0]) {
        throw new Error('Trip not found or unauthorized');
      }
      
      return result[0];
    },

    cancelTrip: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Trip> => {
      const user = requireAuth(context);
      
      const result = await query<Trip>(
        `UPDATE trips SET trip_status = 'cancelled' WHERE id = $1 AND driver_id = $2 RETURNING *`,
        [id, user.uid]
      );
      
      if (!result[0]) {
        throw new Error('Trip not found or unauthorized');
      }
      
      return result[0];
    },

    startTrip: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Trip> => {
      const user = requireAuth(context);
      
      const result = await query<Trip>(
        `UPDATE trips SET trip_status = 'active' WHERE id = $1 AND driver_id = $2 RETURNING *`,
        [id, user.uid]
      );
      
      if (!result[0]) {
        throw new Error('Trip not found or unauthorized');
      }
      
      return result[0];
    },

    completeTrip: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<Trip> => {
      const user = requireAuth(context);
      
      const result = await query<Trip>(
        `UPDATE trips SET trip_status = 'completed' WHERE id = $1 AND driver_id = $2 RETURNING *`,
        [id, user.uid]
      );
      
      if (!result[0]) {
        throw new Error('Trip not found or unauthorized');
      }
      
      return result[0];
    },
  },

  Subscription: {
    tripLocationUpdate: {
      // Placeholder for subscription resolver
      subscribe: () => {
        // This would use GraphQL subscriptions with pubsub
        return null;
      },
    },

    tripStatusUpdate: {
      // Placeholder for subscription resolver
      subscribe: () => {
        // This would use GraphQL subscriptions with pubsub
        return null;
      },
    },
  },

  // Type resolvers
  Trip: {
    driver: async (parent: Trip) => {
      const result = await query(
        'SELECT * FROM users WHERE id = $1',
        [parent.driver_id]
      );
      
      return result[0];
    },

    bookings: async (parent: Trip) => {
      const result = await query(
        'SELECT * FROM bookings WHERE trip_id = $1',
        [parent.id]
      );
      
      return result;
    },

    originCoordinates: (parent: Trip) => {
      // Parse PostgreSQL POINT type
      return {
        latitude: parent.origin_coordinates.latitude || 0,
        longitude: parent.origin_coordinates.longitude || 0,
      };
    },

    destinationCoordinates: (parent: Trip) => {
      // Parse PostgreSQL POINT type
      return {
        latitude: parent.destination_coordinates.latitude || 0,
        longitude: parent.destination_coordinates.longitude || 0,
      };
    },
  },
};
