import { gql } from 'apollo-server-express';
import { 
  DateTimeResolver, 
  DateResolver, 
  JSONResolver 
} from 'graphql-scalars';

// Custom scalar definitions
const scalarTypeDefs = gql`
  scalar DateTime
  scalar Date
  scalar JSON
`;

// User type definitions
const userTypeDefs = gql`
  enum UserType {
    DRIVER
    RIDER
    BOTH
  }

  enum BackgroundCheckStatus {
    PENDING
    APPROVED
    REJECTED
  }

  enum VehicleType {
    SEDAN
    SUV
    MINIVAN
    BUS
  }

  type User {
    id: ID!
    email: String!
    phone: String!
    firstName: String!
    lastName: String!
    profileImageUrl: String
    userType: UserType!
    isVerified: Boolean!
    isActive: Boolean!
    firebaseCustomClaims: JSON
    driverProfile: DriverProfile
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DriverProfile {
    id: ID!
    user: User!
    licenseNumber: String!
    licenseExpiry: Date!
    licenseImageUrl: String
    vehicle: Vehicle
    backgroundCheckStatus: BackgroundCheckStatus!
    drivingExperienceYears: Int
    averageRating: Float!
    totalTrips: Int!
    isAvailable: Boolean!
    createdAt: DateTime!
  }

  type Vehicle {
    id: ID!
    driver: User!
    make: String!
    model: String!
    year: Int!
    color: String!
    licensePlate: String!
    vehicleType: VehicleType!
    passengerCapacity: Int!
    insurancePolicyNumber: String
    insuranceExpiry: Date
    vehicleImages: [String!]!
    isVerified: Boolean!
    createdAt: DateTime!
  }

  input CreateUserInput {
    email: String!
    phone: String!
    firstName: String!
    lastName: String!
    userType: UserType!
  }

  input UpdateUserInput {
    firstName: String
    lastName: String
    profileImageUrl: String
  }

  input CreateDriverProfileInput {
    licenseNumber: String!
    licenseExpiry: Date!
    licenseImageUrl: String
    drivingExperienceYears: Int
  }

  input CreateVehicleInput {
    make: String!
    model: String!
    year: Int!
    color: String!
    licensePlate: String!
    vehicleType: VehicleType!
    passengerCapacity: Int!
    insurancePolicyNumber: String
    insuranceExpiry: Date
    vehicleImages: [String!]!
  }
`;

// Trip type definitions
const tripTypeDefs = gql`
  enum TripStatus {
    SCHEDULED
    ACTIVE
    COMPLETED
    CANCELLED
  }

  enum TripType {
    ONE_WAY
    ROUND_TRIP
  }

  type Coordinates {
    latitude: Float!
    longitude: Float!
  }

  type Trip {
    id: ID!
    driver: User!
    originCity: String!
    destinationCity: String!
    originCoordinates: Coordinates!
    destinationCoordinates: Coordinates!
    departureTime: DateTime!
    estimatedArrivalTime: DateTime
    availableSeats: Int!
    pricePerSeat: Float!
    tripStatus: TripStatus!
    tripType: TripType!
    returnDepartureTime: DateTime
    description: String
    firebaseRealtimePath: String
    bookings: [Booking!]!
    createdAt: DateTime!
  }

  input CoordinatesInput {
    latitude: Float!
    longitude: Float!
  }

  input CreateTripInput {
    originCity: String!
    destinationCity: String!
    originCoordinates: CoordinatesInput!
    destinationCoordinates: CoordinatesInput!
    departureTime: DateTime!
    availableSeats: Int!
    pricePerSeat: Float!
    tripType: TripType!
    returnDepartureTime: DateTime
    description: String
  }

  input TripSearchInput {
    originCity: String
    destinationCity: String
    departureDate: Date
    minPrice: Float
    maxPrice: Float
    availableSeats: Int
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type TripEdge {
    node: Trip!
    cursor: String!
  }

  type TripConnection {
    edges: [TripEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }
`;

// Booking type definitions
const bookingTypeDefs = gql`
  enum BookingStatus {
    PENDING
    CONFIRMED
    CANCELLED
    COMPLETED
  }

  enum PaymentStatus {
    PENDING
    PAID
    FAILED
    REFUNDED
  }

  type Booking {
    id: ID!
    trip: Trip!
    rider: User!
    seatsBooked: Int!
    totalAmount: Float!
    commissionAmount: Float!
    bookingStatus: BookingStatus!
    paymentStatus: PaymentStatus!
    paymentMethod: String!
    pickupLocation: String
    pickupCoordinates: Coordinates
    specialRequests: String
    paystackReference: String
    payment: Payment
    createdAt: DateTime!
  }

  type Payment {
    id: ID!
    booking: Booking!
    amount: Float!
    paymentMethod: String!
    paystackReference: String!
    paystackTransactionId: String
    paymentStatus: PaymentStatus!
    gatewayResponse: JSON
    createdAt: DateTime!
  }

  input CreateBookingInput {
    tripId: ID!
    seatsBooked: Int!
    pickupLocation: String
    pickupCoordinates: CoordinatesInput
    specialRequests: String
  }

  input InitializePaymentInput {
    bookingId: ID!
    paymentMethod: String!
  }
`;

// Review and notification type definitions
const reviewTypeDefs = gql`
  type Review {
    id: ID!
    booking: Booking!
    reviewer: User!
    reviewee: User!
    rating: Int!
    comment: String
    createdAt: DateTime!
  }

  type Notification {
    id: ID!
    user: User!
    title: String!
    message: String!
    notificationType: String!
    fcmMessageId: String
    isRead: Boolean!
    data: JSON
    createdAt: DateTime!
  }
`;

// Query definitions
const queryTypeDefs = gql`
  type Query {
    # User Queries
    me: User
    user(id: ID!): User
    
    # Trip Queries
    trips(
      first: Int
      after: String
      last: Int
      before: String
      filter: TripSearchInput
    ): TripConnection!
    
    trip(id: ID!): Trip
    myTrips(status: TripStatus): [Trip!]!
    
    # Booking Queries
    booking(id: ID!): Booking
    myBookings(status: BookingStatus): [Booking!]!
    tripBookings(tripId: ID!): [Booking!]!
    
    # Payment Queries
    payment(id: ID!): Payment
    paymentHistory(first: Int, after: String): [Payment!]!
    
    # Review Queries
    userReviews(userId: ID!, first: Int, after: String): [Review!]!
    
    # Notification Queries
    myNotifications(unreadOnly: Boolean): [Notification!]!
  }
`;

// Mutation definitions
const mutationTypeDefs = gql`
  type Mutation {
    # Authentication
    verifyFirebaseToken(token: String!): User!
    createUser(input: CreateUserInput!): User!
    updateUser(input: UpdateUserInput!): User!
    
    # Driver Profile
    createDriverProfile(input: CreateDriverProfileInput!): DriverProfile!
    updateDriverProfile(input: CreateDriverProfileInput!): DriverProfile!
    toggleDriverAvailability: DriverProfile!
    
    # Vehicle Management
    createVehicle(input: CreateVehicleInput!): Vehicle!
    updateVehicle(id: ID!, input: CreateVehicleInput!): Vehicle!
    deleteVehicle(id: ID!): Boolean!
    
    # Trip Management
    createTrip(input: CreateTripInput!): Trip!
    updateTrip(id: ID!, input: CreateTripInput!): Trip!
    cancelTrip(id: ID!): Trip!
    startTrip(id: ID!): Trip!
    completeTrip(id: ID!): Trip!
    
    # Booking Management
    createBooking(input: CreateBookingInput!): Booking!
    confirmBooking(id: ID!): Booking!
    cancelBooking(id: ID!): Booking!
    
    # Payment Processing
    initializePayment(input: InitializePaymentInput!): Payment!
    verifyPayment(reference: String!): Payment!
    processRefund(paymentId: ID!): Payment!
    
    # Review System
    createReview(bookingId: ID!, rating: Int!, comment: String): Review!
    
    # Notifications
    markNotificationAsRead(id: ID!): Notification!
    markAllNotificationsAsRead: Boolean!
    
    # File Upload
    generateUploadUrl(fileName: String!, fileType: String!): String!
  }
`;

// Subscription definitions
const subscriptionTypeDefs = gql`
  type TripLocationUpdate {
    tripId: ID!
    location: Coordinates!
    timestamp: DateTime!
    eta: DateTime
  }

  type Subscription {
    # Real-time Trip Updates
    tripLocationUpdate(tripId: ID!): TripLocationUpdate!
    tripStatusUpdate(tripId: ID!): Trip!
    
    # Booking Updates
    bookingStatusUpdate(bookingId: ID!): Booking!
    newBookingForTrip(tripId: ID!): Booking!
    
    # Notifications
    newNotification(userId: ID!): Notification!
    
    # Driver Status
    driverAvailabilityUpdate(driverId: ID!): DriverProfile!
  }
`;

// Combine all type definitions
const typeDefs = [
  scalarTypeDefs,
  userTypeDefs,
  tripTypeDefs,
  bookingTypeDefs,
  reviewTypeDefs,
  queryTypeDefs,
  mutationTypeDefs,
  subscriptionTypeDefs,
];

// Custom scalar resolvers
const scalarResolvers = {
  DateTime: DateTimeResolver,
  Date: DateResolver,
  JSON: JSONResolver,
};

export { typeDefs, scalarResolvers };
