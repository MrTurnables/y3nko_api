import { Request } from 'express';
import { Pool, PoolClient } from 'pg';

// GraphQL Context type
export interface GraphQLContext {
  req: Request;
  user?: FirebaseUser | undefined;
  isAuthenticated: boolean;
}

// Firebase User type
export interface FirebaseUser {
  uid: string;
  email?: string | undefined;
  phone_number?: string | undefined;
  custom_claims?: Record<string, any> | undefined;
}

// Database types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl: boolean | { rejectUnauthorized: boolean };
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

export interface TransactionCallback<T> {
  (client: PoolClient): Promise<T>;
}

// User types
export enum UserType {
  DRIVER = 'driver',
  RIDER = 'rider',
  BOTH = 'both'
}

export enum BackgroundCheckStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum VehicleType {
  SEDAN = 'sedan',
  SUV = 'suv',
  MINIVAN = 'minivan',
  BUS = 'bus'
}

export enum TripStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TripType {
  ONE_WAY = 'one_way',
  ROUND_TRIP = 'round_trip'
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

// Database entity types
export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  user_type: UserType;
  is_verified: boolean;
  is_active: boolean;
  firebase_custom_claims?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  license_number: string;
  license_expiry: Date;
  license_image_url?: string;
  vehicle_id?: string;
  background_check_status: BackgroundCheckStatus;
  driving_experience_years?: number;
  average_rating: number;
  total_trips: number;
  is_available: boolean;
  created_at: Date;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  vehicle_type: VehicleType;
  passenger_capacity: number;
  insurance_policy_number?: string;
  insurance_expiry?: Date;
  vehicle_images: string[];
  is_verified: boolean;
  created_at: Date;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Trip {
  id: string;
  driver_id: string;
  origin_city: string;
  destination_city: string;
  origin_coordinates: Coordinates;
  destination_coordinates: Coordinates;
  departure_time: Date;
  estimated_arrival_time?: Date;
  available_seats: number;
  price_per_seat: number;
  trip_status: TripStatus;
  trip_type: TripType;
  return_departure_time?: Date;
  description?: string;
  firebase_realtime_path?: string;
  created_at: Date;
}

export interface Booking {
  id: string;
  trip_id: string;
  rider_id: string;
  seats_booked: number;
  total_amount: number;
  commission_amount: number;
  booking_status: BookingStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  pickup_location?: string;
  pickup_coordinates?: Coordinates;
  special_requests?: string;
  paystack_reference?: string;
  created_at: Date;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: string;
  paystack_reference: string;
  paystack_transaction_id?: string;
  payment_status: PaymentStatus;
  gateway_response?: Record<string, any>;
  created_at: Date;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  fcm_message_id?: string;
  is_read: boolean;
  data?: Record<string, any>;
  created_at: Date;
}

// Input types for GraphQL mutations
export interface CreateUserInput {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  userType: UserType;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export interface CreateDriverProfileInput {
  licenseNumber: string;
  licenseExpiry: Date;
  licenseImageUrl?: string;
  drivingExperienceYears?: number;
}

export interface CreateVehicleInput {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vehicleType: VehicleType;
  passengerCapacity: number;
  insurancePolicyNumber?: string;
  insuranceExpiry?: Date;
  vehicleImages: string[];
}

export interface CoordinatesInput {
  latitude: number;
  longitude: number;
}

export interface CreateTripInput {
  originCity: string;
  destinationCity: string;
  originCoordinates: CoordinatesInput;
  destinationCoordinates: CoordinatesInput;
  departureTime: Date;
  availableSeats: number;
  pricePerSeat: number;
  tripType: TripType;
  returnDepartureTime?: Date;
  description?: string;
}

export interface TripSearchInput {
  originCity?: string;
  destinationCity?: string;
  departureDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  availableSeats?: number;
}

export interface CreateBookingInput {
  tripId: string;
  seatsBooked: number;
  pickupLocation?: string;
  pickupCoordinates?: CoordinatesInput;
  specialRequests?: string;
}

export interface InitializePaymentInput {
  bookingId: string;
  paymentMethod: string;
}

// Pagination types
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string | undefined;
  endCursor?: string | undefined;
}

export interface Connection<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export type TripConnection = Connection<Trip>;

// Error types
export interface GraphQLError {
  message: string;
  code?: string;
  statusCode?: number;
  extensions?: Record<string, any>;
}
