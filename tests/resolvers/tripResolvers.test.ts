import { jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockRequireAuth = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  query: mockQuery,
}));

jest.mock('../../src/middleware/auth', () => ({
  requireAuth: mockRequireAuth,
}));

jest.mock('../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-trip-uuid'),
}));

describe('Trip Resolvers', () => {
  let tripResolvers: any;
  const mockUser = {
    uid: 'test-driver-id',
    email: 'driver@example.com',
    name: 'Test Driver',
  };

  const mockContext = {
    user: mockUser,
    req: {
      headers: {
        authorization: 'Bearer test-token',
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRequireAuth.mockReturnValue(mockUser);
    
    // Import after mocking
    const resolverModule = await import('../../src/resolvers/tripResolvers');
    tripResolvers = resolverModule.tripResolvers;
  });

  describe('Query resolvers', () => {
    describe('trip', () => {
      it('should return trip by id', async () => {
        const mockTrip = {
          id: 'trip-id',
          driverId: 'test-driver-id',
          originCity: 'Lagos',
          destinationCity: 'Abuja',
          departureTime: '2025-01-28T08:00:00Z',
          availableSeats: 3,
          pricePerSeat: 15000,
          tripStatus: 'scheduled',
        };
        
        mockQuery.mockResolvedValue([mockTrip]);

        const result = await tripResolvers.Query.trip({}, { id: 'trip-id' }, mockContext);

        expect(mockRequireAuth).toHaveBeenCalledWith(mockContext);
        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM trips WHERE id = $1',
          ['trip-id']
        );
        expect(result).toEqual(mockTrip);
      });

      it('should return null when trip not found', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await tripResolvers.Query.trip({}, { id: 'trip-id' }, mockContext);

        expect(result).toBeNull();
      });
    });

    describe('myTrips', () => {
      it('should return trips for current driver', async () => {
        const mockTrips = [
          {
            id: 'trip-1',
            driverId: 'test-driver-id',
            originCity: 'Lagos',
            destinationCity: 'Abuja',
            tripStatus: 'scheduled',
          },
          {
            id: 'trip-2',
            driverId: 'test-driver-id',
            originCity: 'Abuja',
            destinationCity: 'Lagos',
            tripStatus: 'completed',
          },
        ];
        
        mockQuery.mockResolvedValue(mockTrips);

        const result = await tripResolvers.Query.myTrips({}, {}, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM trips WHERE driver_id = $1 ORDER BY created_at DESC',
          ['test-driver-id']
        );
        expect(result).toEqual(mockTrips);
      });

      it('should filter trips by status', async () => {
        const mockTrips = [
          {
            id: 'trip-1',
            driverId: 'test-driver-id',
            tripStatus: 'scheduled',
          },
        ];
        
        mockQuery.mockResolvedValue(mockTrips);

        const result = await tripResolvers.Query.myTrips({}, { status: 'SCHEDULED' }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM trips WHERE driver_id = $1 AND trip_status = $2 ORDER BY created_at DESC',
          ['test-driver-id', 'SCHEDULED']
        );
        expect(result).toEqual(mockTrips);
      });
    });

    describe('trips', () => {
      it('should return empty trip connection', async () => {
        const result = await tripResolvers.Query.trips({}, {}, mockContext);

        expect(result).toEqual({
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: undefined,
            endCursor: undefined,
          },
          totalCount: 0,
        });
      });
    });
  });

  describe('Mutation resolvers', () => {
    describe('createTrip', () => {
      it('should create a new trip', async () => {
        const input = {
          originCity: 'Lagos',
          destinationCity: 'Abuja',
          originCoordinates: { latitude: 6.5244, longitude: 3.3792 },
          destinationCoordinates: { latitude: 9.0765, longitude: 7.3986 },
          departureTime: '2025-01-28T08:00:00Z',
          availableSeats: 3,
          pricePerSeat: 15000,
          tripType: 'ONE_WAY',
          description: 'Comfortable ride to Abuja',
        };

        const mockCreatedTrip = {
          id: 'mock-trip-uuid',
          driverId: 'test-driver-id',
          ...input,
          tripStatus: 'scheduled',
        };

        mockQuery.mockResolvedValue([mockCreatedTrip]);

        const result = await tripResolvers.Mutation.createTrip({}, { input }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO trips'),
          expect.arrayContaining([
            'mock-trip-uuid',
            'test-driver-id',
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
            null,
            input.description,
          ])
        );
        expect(result).toEqual(mockCreatedTrip);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Trip created successfully',
          { userId: 'test-driver-id', tripId: 'mock-trip-uuid' }
        );
      });

      it('should throw error when trip creation fails', async () => {
        const input = {
          originCity: 'Lagos',
          destinationCity: 'Abuja',
          originCoordinates: { latitude: 6.5244, longitude: 3.3792 },
          destinationCoordinates: { latitude: 9.0765, longitude: 7.3986 },
          departureTime: '2025-01-28T08:00:00Z',
          availableSeats: 3,
          pricePerSeat: 15000,
          tripType: 'ONE_WAY',
        };

        mockQuery.mockResolvedValue([]);

        await expect(
          tripResolvers.Mutation.createTrip({}, { input }, mockContext)
        ).rejects.toThrow('Failed to create trip');
      });
    });

    describe('cancelTrip', () => {
      it('should cancel trip successfully', async () => {
        const mockCancelledTrip = {
          id: 'trip-id',
          driverId: 'test-driver-id',
          tripStatus: 'cancelled',
        };

        mockQuery.mockResolvedValue([mockCancelledTrip]);

        const result = await tripResolvers.Mutation.cancelTrip({}, { id: 'trip-id' }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          "UPDATE trips SET trip_status = 'cancelled' WHERE id = $1 AND driver_id = $2 RETURNING *",
          ['trip-id', 'test-driver-id']
        );
        expect(result).toEqual(mockCancelledTrip);
      });

      it('should throw error when trip not found', async () => {
        mockQuery.mockResolvedValue([]);

        await expect(
          tripResolvers.Mutation.cancelTrip({}, { id: 'trip-id' }, mockContext)
        ).rejects.toThrow('Trip not found or unauthorized');
      });
    });

    describe('startTrip', () => {
      it('should start trip successfully', async () => {
        const mockActiveTrip = {
          id: 'trip-id',
          driverId: 'test-driver-id',
          tripStatus: 'active',
        };

        mockQuery.mockResolvedValue([mockActiveTrip]);

        const result = await tripResolvers.Mutation.startTrip({}, { id: 'trip-id' }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          "UPDATE trips SET trip_status = 'active' WHERE id = $1 AND driver_id = $2 RETURNING *",
          ['trip-id', 'test-driver-id']
        );
        expect(result).toEqual(mockActiveTrip);
      });
    });

    describe('completeTrip', () => {
      it('should complete trip successfully', async () => {
        const mockCompletedTrip = {
          id: 'trip-id',
          driverId: 'test-driver-id',
          tripStatus: 'completed',
        };

        mockQuery.mockResolvedValue([mockCompletedTrip]);

        const result = await tripResolvers.Mutation.completeTrip({}, { id: 'trip-id' }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          "UPDATE trips SET trip_status = 'completed' WHERE id = $1 AND driver_id = $2 RETURNING *",
          ['trip-id', 'test-driver-id']
        );
        expect(result).toEqual(mockCompletedTrip);
      });
    });
  });

  describe('Type resolvers', () => {
    describe('Trip.driver', () => {
      it('should return driver for trip', async () => {
        const mockDriver = {
          id: 'driver-id',
          email: 'driver@example.com',
          firstName: 'John',
          lastName: 'Driver',
        };

        mockQuery.mockResolvedValue([mockDriver]);

        const result = await tripResolvers.Trip.driver({ driver_id: 'driver-id' });

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = $1',
          ['driver-id']
        );
        expect(result).toEqual(mockDriver);
      });
    });

    describe('Trip.bookings', () => {
      it('should return bookings for trip', async () => {
        const mockBookings = [
          {
            id: 'booking-1',
            tripId: 'trip-id',
            riderId: 'rider-1',
            seatsBooked: 2,
          },
          {
            id: 'booking-2',
            tripId: 'trip-id',
            riderId: 'rider-2',
            seatsBooked: 1,
          },
        ];

        mockQuery.mockResolvedValue(mockBookings);

        const result = await tripResolvers.Trip.bookings({ id: 'trip-id' });

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM bookings WHERE trip_id = $1',
          ['trip-id']
        );
        expect(result).toEqual(mockBookings);
      });
    });

    describe('Trip.originCoordinates', () => {
      it('should return origin coordinates', () => {
        const mockTrip = {
          origin_coordinates: {
            latitude: 6.5244,
            longitude: 3.3792,
          },
        };

        const result = tripResolvers.Trip.originCoordinates(mockTrip);

        expect(result).toEqual({
          latitude: 6.5244,
          longitude: 3.3792,
        });
      });

      it('should return default coordinates when missing', () => {
        const mockTrip = {
          origin_coordinates: {},
        };

        const result = tripResolvers.Trip.originCoordinates(mockTrip);

        expect(result).toEqual({
          latitude: 0,
          longitude: 0,
        });
      });
    });

    describe('Trip.destinationCoordinates', () => {
      it('should return destination coordinates', () => {
        const mockTrip = {
          destination_coordinates: {
            latitude: 9.0765,
            longitude: 7.3986,
          },
        };

        const result = tripResolvers.Trip.destinationCoordinates(mockTrip);

        expect(result).toEqual({
          latitude: 9.0765,
          longitude: 7.3986,
        });
      });
    });
  });

  describe('Subscription resolvers', () => {
    describe('tripLocationUpdate', () => {
      it('should return null for subscription placeholder', () => {
        const result = tripResolvers.Subscription.tripLocationUpdate.subscribe();
        expect(result).toBeNull();
      });
    });

    describe('tripStatusUpdate', () => {
      it('should return null for subscription placeholder', () => {
        const result = tripResolvers.Subscription.tripStatusUpdate.subscribe();
        expect(result).toBeNull();
      });
    });
  });
});
