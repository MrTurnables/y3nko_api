import { jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn<any>();
const mockTransaction = jest.fn<any>();
const mockRequireAuth = jest.fn<any>();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

jest.mock('../../src/middleware/auth', () => ({
  requireAuth: mockRequireAuth,
}));

jest.mock('../../src/utils/logger', () => ({
  logger: mockLogger,
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('User Resolvers', () => {
  let userResolvers: any;
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
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
    const resolverModule = await import('../../src/resolvers/userResolvers');
    userResolvers = resolverModule.userResolvers;
  });

  describe('Query resolvers', () => {
    describe('me', () => {
      it('should return current user', async () => {
        const mockUserData = {
          id: 'test-user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        };
        
        mockQuery.mockResolvedValue([mockUserData]);

        const result = await userResolvers.Query.me({}, {}, mockContext);

        expect(mockRequireAuth).toHaveBeenCalledWith(mockContext);
        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = $1',
          ['test-user-id']
        );
        expect(result).toEqual(mockUserData);
      });

      it('should return null when user not found', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await userResolvers.Query.me({}, {}, mockContext);

        expect(result).toBeNull();
      });
    });

    describe('user', () => {
      it('should return user by id', async () => {
        const mockUserData = {
          id: 'other-user-id',
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User',
        };
        
        mockQuery.mockResolvedValue([mockUserData]);

        const result = await userResolvers.Query.user({}, { id: 'other-user-id' }, mockContext);

        expect(mockRequireAuth).toHaveBeenCalledWith(mockContext);
        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = $1 AND is_active = true',
          ['other-user-id']
        );
        expect(result).toEqual(mockUserData);
      });
    });
  });

  describe('Mutation resolvers', () => {
    describe('createUser', () => {
      it('should create a new user', async () => {
        const input = {
          email: 'new@example.com',
          phone: '+1234567890',
          firstName: 'New',
          lastName: 'User',
          userType: 'RIDER',
        };

        const mockCreatedUser = {
          id: 'test-user-id',
          ...input,
          isVerified: false,
          isActive: true,
        };

        mockQuery.mockResolvedValue([mockCreatedUser]);

        const result = await userResolvers.Mutation.createUser({}, { input }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO users'),
          expect.arrayContaining([
            'test-user-id',
            input.email,
            input.phone,
            input.firstName,
            input.lastName,
            input.userType,
            false,
            true,
          ])
        );
        expect(result).toEqual(mockCreatedUser);
        expect(mockLogger.info).toHaveBeenCalledWith(
          'User created successfully',
          { userId: 'test-user-id', email: input.email }
        );
      });

      it('should throw error when user creation fails', async () => {
        const input = {
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          userType: 'RIDER',
        };

        mockQuery.mockResolvedValue([]);

        await expect(
          userResolvers.Mutation.createUser({}, { input }, mockContext)
        ).rejects.toThrow('Failed to create user');
      });
    });

    describe('updateUser', () => {
      it('should update user successfully', async () => {
        const input = {
          firstName: 'Updated',
          lastName: 'Name',
          profileImageUrl: 'https://example.com/image.jpg',
        };

        const mockUpdatedUser = {
          id: 'test-user-id',
          ...input,
          email: 'test@example.com',
        };

        mockQuery.mockResolvedValue([mockUpdatedUser]);

        const result = await userResolvers.Mutation.updateUser({}, { input }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE users SET'),
          expect.arrayContaining([input.firstName, input.lastName, input.profileImageUrl, 'test-user-id'])
        );
        expect(result).toEqual(mockUpdatedUser);
      });

      it('should throw error when user not found', async () => {
        const input = { firstName: 'Updated' };
        mockQuery.mockResolvedValue([]);

        await expect(
          userResolvers.Mutation.updateUser({}, { input }, mockContext)
        ).rejects.toThrow('User not found');
      });
    });

    describe('createDriverProfile', () => {
      it('should create driver profile successfully', async () => {
        const input = {
          licenseNumber: 'DL123456789',
          licenseExpiry: '2026-12-31',
          licenseImageUrl: 'https://example.com/license.jpg',
          drivingExperienceYears: 5,
        };

        const mockDriverProfile = {
          id: 'mock-uuid',
          userId: 'test-user-id',
          ...input,
          backgroundCheckStatus: 'pending',
          averageRating: 0.0,
          totalTrips: 0,
          isAvailable: false,
        };

        mockQuery.mockResolvedValue([mockDriverProfile]);

        const result = await userResolvers.Mutation.createDriverProfile({}, { input }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO driver_profiles'),
          expect.arrayContaining([
            'mock-uuid',
            'test-user-id',
            input.licenseNumber,
            input.licenseExpiry,
            input.licenseImageUrl,
            input.drivingExperienceYears,
            'pending',
            0.0,
            0,
            false,
          ])
        );
        expect(result).toEqual(mockDriverProfile);
      });
    });

    describe('toggleDriverAvailability', () => {
      it('should toggle driver availability', async () => {
        const mockDriverProfile = {
          id: 'driver-profile-id',
          userId: 'test-user-id',
          isAvailable: true,
        };

        mockQuery.mockResolvedValue([mockDriverProfile]);

        const result = await userResolvers.Mutation.toggleDriverAvailability({}, {}, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          'UPDATE driver_profiles SET is_available = NOT is_available WHERE user_id = $1 RETURNING *',
          ['test-user-id']
        );
        expect(result).toEqual(mockDriverProfile);
      });

      it('should throw error when driver profile not found', async () => {
        mockQuery.mockResolvedValue([]);

        await expect(
          userResolvers.Mutation.toggleDriverAvailability({}, {}, mockContext)
        ).rejects.toThrow('Driver profile not found');
      });
    });

    describe('createVehicle', () => {
      it('should create vehicle successfully', async () => {
        const input = {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          color: 'Blue',
          licensePlate: 'ABC123',
          vehicleType: 'SEDAN',
          passengerCapacity: 4,
          vehicleImages: ['image1.jpg', 'image2.jpg'],
        };

        const mockVehicle = {
          id: 'mock-uuid',
          driverId: 'test-user-id',
          ...input,
          isVerified: false,
        };

        mockQuery.mockResolvedValue([mockVehicle]);

        const result = await userResolvers.Mutation.createVehicle({}, { input }, mockContext);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO vehicles'),
          expect.arrayContaining([
            'mock-uuid',
            'test-user-id',
            input.make,
            input.model,
            input.year,
            input.color,
            input.licensePlate,
            input.vehicleType,
            input.passengerCapacity,
            null,
            null,
            JSON.stringify(input.vehicleImages),
            false,
          ])
        );
        expect(result).toEqual(mockVehicle);
      });
    });

    describe('deleteVehicle', () => {
      it('should delete vehicle successfully', async () => {
        mockQuery.mockResolvedValue([{ id: 'vehicle-id' }]);

        const result = await userResolvers.Mutation.deleteVehicle(
          {},
          { id: 'vehicle-id' },
          mockContext
        );

        expect(mockQuery).toHaveBeenCalledWith(
          'DELETE FROM vehicles WHERE id = $1 AND driver_id = $2',
          ['vehicle-id', 'test-user-id']
        );
        expect(result).toBe(true);
      });

      it('should return false when vehicle not found', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await userResolvers.Mutation.deleteVehicle(
          {},
          { id: 'vehicle-id' },
          mockContext
        );

        expect(result).toBe(false);
      });
    });
  });

  describe('Type resolvers', () => {
    describe('User.driverProfile', () => {
      it('should return driver profile for user', async () => {
        const mockDriverProfile = {
          id: 'driver-profile-id',
          userId: 'test-user-id',
        };

        mockQuery.mockResolvedValue([mockDriverProfile]);

        const result = await userResolvers.User.driverProfile({ id: 'test-user-id' });

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM driver_profiles WHERE user_id = $1',
          ['test-user-id']
        );
        expect(result).toEqual(mockDriverProfile);
      });

      it('should return null when no driver profile found', async () => {
        mockQuery.mockResolvedValue([]);

        const result = await userResolvers.User.driverProfile({ id: 'test-user-id' });

        expect(result).toBeNull();
      });
    });

    describe('DriverProfile.user', () => {
      it('should return user for driver profile', async () => {
        const mockUser = {
          id: 'test-user-id',
          email: 'test@example.com',
        };

        mockQuery.mockResolvedValue([mockUser]);

        const result = await userResolvers.DriverProfile.user({ user_id: 'test-user-id' });

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = $1',
          ['test-user-id']
        );
        expect(result).toEqual(mockUser);
      });

      it('should throw error when user not found', async () => {
        mockQuery.mockResolvedValue([]);

        await expect(
          userResolvers.DriverProfile.user({ user_id: 'test-user-id' })
        ).rejects.toThrow('User not found');
      });
    });

    describe('Vehicle.driver', () => {
      it('should return driver for vehicle', async () => {
        const mockDriver = {
          id: 'driver-id',
          email: 'driver@example.com',
        };

        mockQuery.mockResolvedValue([mockDriver]);

        const result = await userResolvers.Vehicle.driver({ driver_id: 'driver-id' });

        expect(mockQuery).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = $1',
          ['driver-id']
        );
        expect(result).toEqual(mockDriver);
      });
    });
  });
});
