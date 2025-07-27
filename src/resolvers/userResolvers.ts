import { GraphQLContext, User, DriverProfile, Vehicle, CreateUserInput, UpdateUserInput, CreateDriverProfileInput, CreateVehicleInput } from '../types';
import { requireAuth } from '../middleware/auth';
import { query, transaction } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphQLContext): Promise<User | null> => {
      const user = requireAuth(context);
      
      const result = await query<User>(
        'SELECT * FROM users WHERE id = $1',
        [user.uid]
      );
      
      return result[0] || null;
    },

    user: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<User | null> => {
      requireAuth(context);
      
      const result = await query<User>(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [id]
      );
      
      return result[0] || null;
    },
  },

  Mutation: {
    verifyFirebaseToken: async (_: any, { token }: { token: string }, context: GraphQLContext): Promise<User> => {
      // This is handled by the auth middleware, so we just return the current user
      const user = requireAuth(context);
      
      const result = await query<User>(
        'SELECT * FROM users WHERE id = $1',
        [user.uid]
      );
      
      if (!result[0]) {
        throw new Error('User not found in database');
      }
      
      return result[0];
    },

    createUser: async (_: any, { input }: { input: CreateUserInput }, context: GraphQLContext): Promise<User> => {
      const firebaseUser = requireAuth(context);
      
      const result = await query<User>(
        `INSERT INTO users (id, email, phone, first_name, last_name, user_type, is_verified, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [
          firebaseUser.uid,
          input.email,
          input.phone,
          input.firstName,
          input.lastName,
          input.userType,
          false,
          true
        ]
      );
      
      if (!result[0]) {
        throw new Error('Failed to create user');
      }
      
      logger.info('User created successfully', { userId: firebaseUser.uid, email: input.email });
      
      return result[0];
    },

    updateUser: async (_: any, { input }: { input: UpdateUserInput }, context: GraphQLContext): Promise<User> => {
      const user = requireAuth(context);
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (input.firstName) {
        updateFields.push(`first_name = $${paramCount++}`);
        values.push(input.firstName);
      }
      
      if (input.lastName) {
        updateFields.push(`last_name = $${paramCount++}`);
        values.push(input.lastName);
      }
      
      if (input.profileImageUrl) {
        updateFields.push(`profile_image_url = $${paramCount++}`);
        values.push(input.profileImageUrl);
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(user.uid);
      
      const result = await query<User>(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      
      if (!result[0]) {
        throw new Error('User not found');
      }
      
      return result[0];
    },

    createDriverProfile: async (_: any, { input }: { input: CreateDriverProfileInput }, context: GraphQLContext): Promise<DriverProfile> => {
      const user = requireAuth(context);
      
      const result = await query<DriverProfile>(
        `INSERT INTO driver_profiles (id, user_id, license_number, license_expiry, license_image_url, driving_experience_years, background_check_status, average_rating, total_trips, is_available, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         RETURNING *`,
        [
          uuidv4(),
          user.uid,
          input.licenseNumber,
          input.licenseExpiry,
          input.licenseImageUrl || null,
          input.drivingExperienceYears || null,
          'pending',
          0.0,
          0,
          false
        ]
      );
      
      if (!result[0]) {
        throw new Error('Failed to create driver profile');
      }
      
      logger.info('Driver profile created successfully', { userId: user.uid });
      
      return result[0];
    },

    updateDriverProfile: async (_: any, { input }: { input: CreateDriverProfileInput }, context: GraphQLContext): Promise<DriverProfile> => {
      const user = requireAuth(context);
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (input.licenseNumber) {
        updateFields.push(`license_number = $${paramCount++}`);
        values.push(input.licenseNumber);
      }
      
      if (input.licenseExpiry) {
        updateFields.push(`license_expiry = $${paramCount++}`);
        values.push(input.licenseExpiry);
      }
      
      if (input.licenseImageUrl) {
        updateFields.push(`license_image_url = $${paramCount++}`);
        values.push(input.licenseImageUrl);
      }
      
      if (input.drivingExperienceYears !== undefined) {
        updateFields.push(`driving_experience_years = $${paramCount++}`);
        values.push(input.drivingExperienceYears);
      }
      
      values.push(user.uid);
      
      const result = await query<DriverProfile>(
        `UPDATE driver_profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramCount} RETURNING *`,
        values
      );
      
      if (!result[0]) {
        throw new Error('Driver profile not found');
      }
      
      return result[0];
    },

    toggleDriverAvailability: async (_: any, __: any, context: GraphQLContext): Promise<DriverProfile> => {
      const user = requireAuth(context);
      
      const result = await query<DriverProfile>(
        `UPDATE driver_profiles SET is_available = NOT is_available WHERE user_id = $1 RETURNING *`,
        [user.uid]
      );
      
      if (!result[0]) {
        throw new Error('Driver profile not found');
      }
      
      return result[0];
    },

    createVehicle: async (_: any, { input }: { input: CreateVehicleInput }, context: GraphQLContext): Promise<Vehicle> => {
      const user = requireAuth(context);
      
      const result = await query<Vehicle>(
        `INSERT INTO vehicles (id, driver_id, make, model, year, color, license_plate, vehicle_type, passenger_capacity, insurance_policy_number, insurance_expiry, vehicle_images, is_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         RETURNING *`,
        [
          uuidv4(),
          user.uid,
          input.make,
          input.model,
          input.year,
          input.color,
          input.licensePlate,
          input.vehicleType,
          input.passengerCapacity,
          input.insurancePolicyNumber || null,
          input.insuranceExpiry || null,
          JSON.stringify(input.vehicleImages),
          false
        ]
      );
      
      if (!result[0]) {
        throw new Error('Failed to create vehicle');
      }
      
      logger.info('Vehicle created successfully', { userId: user.uid, vehicleId: result[0].id });
      
      return result[0];
    },

    updateVehicle: async (_: any, { id, input }: { id: string; input: CreateVehicleInput }, context: GraphQLContext): Promise<Vehicle> => {
      const user = requireAuth(context);
      
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = key === 'licensePlate' ? 'license_plate' : 
                         key === 'vehicleType' ? 'vehicle_type' :
                         key === 'passengerCapacity' ? 'passenger_capacity' :
                         key === 'insurancePolicyNumber' ? 'insurance_policy_number' :
                         key === 'insuranceExpiry' ? 'insurance_expiry' :
                         key === 'vehicleImages' ? 'vehicle_images' : key;
          
          updateFields.push(`${dbField} = $${paramCount++}`);
          values.push(key === 'vehicleImages' ? JSON.stringify(value) : value);
        }
      });
      
      values.push(id, user.uid);
      
      const result = await query<Vehicle>(
        `UPDATE vehicles SET ${updateFields.join(', ')} WHERE id = $${paramCount} AND driver_id = $${paramCount + 1} RETURNING *`,
        values
      );
      
      if (!result[0]) {
        throw new Error('Vehicle not found or unauthorized');
      }
      
      return result[0];
    },

    deleteVehicle: async (_: any, { id }: { id: string }, context: GraphQLContext): Promise<boolean> => {
      const user = requireAuth(context);
      
      const result = await query(
        'DELETE FROM vehicles WHERE id = $1 AND driver_id = $2',
        [id, user.uid]
      );
      
      return result.length > 0;
    },

    generateUploadUrl: async (_: any, { fileName, fileType }: { fileName: string; fileType: string }, context: GraphQLContext): Promise<string> => {
      requireAuth(context);
      
      // This would integrate with UploadThing or similar service
      // For now, return a placeholder URL
      return `https://uploadthing.com/upload/${fileName}?type=${fileType}`;
    },
  },

  // Type resolvers
  User: {
    driverProfile: async (parent: User): Promise<DriverProfile | null> => {
      const result = await query<DriverProfile>(
        'SELECT * FROM driver_profiles WHERE user_id = $1',
        [parent.id]
      );
      
      return result[0] || null;
    },
  },

  DriverProfile: {
    user: async (parent: DriverProfile): Promise<User> => {
      const result = await query<User>(
        'SELECT * FROM users WHERE id = $1',
        [parent.user_id]
      );
      
      if (!result[0]) {
        throw new Error('User not found');
      }
      
      return result[0];
    },

    vehicle: async (parent: DriverProfile): Promise<Vehicle | null> => {
      if (!parent.vehicle_id) return null;
      
      const result = await query<Vehicle>(
        'SELECT * FROM vehicles WHERE id = $1',
        [parent.vehicle_id]
      );
      
      return result[0] || null;
    },
  },

  Vehicle: {
    driver: async (parent: Vehicle): Promise<User> => {
      const result = await query<User>(
        'SELECT * FROM users WHERE id = $1',
        [parent.driver_id]
      );
      
      if (!result[0]) {
        throw new Error('Driver not found');
      }
      
      return result[0];
    },
  },
};
