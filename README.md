# Y3nko Ride - GraphQL API

A comprehensive ride-sharing platform API built with Apollo Server, TypeScript, and PostgreSQL. This is the backend GraphQL API for the Y3nko Ride platform that enables drivers and riders to connect for intercity travel.

## 🚀 Features

### Core Functionality
- **User Management**: Firebase Authentication integration with user profiles
- **Driver Onboarding**: License verification, vehicle registration, and background checks
- **Trip Management**: Create, search, and manage intercity trips
- **Booking System**: Real-time booking with seat management
- **Payment Processing**: Paystack integration for secure payments
- **Real-time Updates**: GraphQL subscriptions for live trip tracking
- **Review System**: Rating and feedback system for drivers and riders
- **Notifications**: Firebase Cloud Messaging integration

### Technical Features
- **GraphQL API**: Complete schema with queries, mutations, and subscriptions
- **TypeScript**: Full type safety throughout the application
- **Authentication**: Firebase Auth with custom claims and role-based access
- **Database**: PostgreSQL with optimized indexes and spatial queries
- **Security**: Rate limiting, CORS, helmet security headers
- **File Upload**: UploadThing integration for images and documents
- **Logging**: Structured logging with Winston
- **Error Handling**: Comprehensive error handling and validation

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **GraphQL**: Apollo Server Express
- **Database**: PostgreSQL 14+ with spatial extensions
- **Authentication**: Firebase Authentication
- **Real-time**: Firebase Realtime Database + GraphQL Subscriptions
- **Payments**: Paystack
- **File Storage**: UploadThing (AWS S3)
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Firebase project with Authentication and Realtime Database
- Paystack account for payments
- UploadThing account for file uploads

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd yenko-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create a PostgreSQL database and run the schema:

```bash
# Create database
createdb yenko_ride

# Run schema
psql -d yenko_ride -f database/schema.sql
```

### 4. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yenko_ride
DB_USER=postgres
DB_PASSWORD=your_password

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/

# External Services
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
UPLOADTHING_SECRET=your_uploadthing_secret
```

### 5. Development

Start the development server:

```bash
npm run dev
```

The GraphQL API will be available at:
- **GraphQL Endpoint**: http://localhost:4000/graphql
- **GraphQL Studio**: http://localhost:4000/graphql (in development)
- **Health Check**: http://localhost:4000/health

### 6. Production Build

```bash
npm run build
npm start
```

## 📖 API Documentation

### GraphQL Schema

The API provides a comprehensive GraphQL schema with the following main types:

#### User Management
- `User`: User profiles with Firebase integration
- `DriverProfile`: Driver-specific information and verification
- `Vehicle`: Vehicle registration and details

#### Trip Management
- `Trip`: Trip creation and management
- `TripConnection`: Paginated trip results with filtering

#### Booking System
- `Booking`: Booking creation and status management
- `Payment`: Payment processing with Paystack

#### Reviews & Notifications
- `Review`: Rating system for drivers and riders
- `Notification`: In-app notifications

### Key Queries

```graphql
# Get current user
query Me {
  me {
    id
    email
    firstName
    lastName
    userType
    driverProfile {
      isAvailable
      averageRating
      vehicle {
        make
        model
        year
      }
    }
  }
}

# Search trips
query SearchTrips($filter: TripSearchInput!) {
  trips(filter: $filter) {
    edges {
      node {
        id
        originCity
        destinationCity
        departureTime
        availableSeats
        pricePerSeat
        driver {
          firstName
          lastName
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Key Mutations

```graphql
# Create a trip
mutation CreateTrip($input: CreateTripInput!) {
  createTrip(input: $input) {
    id
    originCity
    destinationCity
    departureTime
    availableSeats
    pricePerSeat
  }
}

# Create a booking
mutation CreateBooking($input: CreateBookingInput!) {
  createBooking(input: $input) {
    id
    seatsBooked
    totalAmount
    bookingStatus
    paymentStatus
  }
}
```

### Subscriptions

```graphql
# Real-time trip updates
subscription TripLocationUpdate($tripId: ID!) {
  tripLocationUpdate(tripId: $tripId) {
    tripId
    location {
      latitude
      longitude
    }
    timestamp
    eta
  }
}

# Booking status updates
subscription BookingStatusUpdate($bookingId: ID!) {
  bookingStatusUpdate(bookingId: $bookingId) {
    id
    bookingStatus
    paymentStatus
  }
}
```

## 🔐 Authentication

The API uses Firebase Authentication with custom claims for role-based access control:

### Headers
```
Authorization: Bearer <firebase-id-token>
```

### User Roles
- **Rider**: Can search trips, create bookings, and leave reviews
- **Driver**: Can create trips, manage bookings, and access driver features
- **Both**: Can act as both rider and driver
- **Admin**: Full system access (custom claim)

## 🗃 Database Schema

The PostgreSQL database includes:

- **Users**: Firebase UID-based user management
- **Driver Profiles**: License verification and ratings
- **Vehicles**: Vehicle registration with image uploads
- **Trips**: Intercity trip management with spatial coordinates
- **Bookings**: Seat reservations with payment tracking
- **Payments**: Paystack transaction records
- **Reviews**: Rating system for quality assurance
- **Notifications**: In-app notification management

Key features:
- Spatial indexes for location-based queries
- Optimized indexes for common search patterns
- ENUM types for data consistency
- Triggers for automatic timestamp updates

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port (default: 4000) | No |
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Yes |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key | Yes |

### Rate Limiting

Default rate limits:
- 100 requests per 15 minutes per IP
- Configurable via environment variables

### CORS

Configured for development and production environments with customizable origins.

## 🧪 Development

### Project Structure

```
src/
├── config/          # Database and service configurations
├── middleware/      # Authentication, rate limiting, error handling
├── models/          # Database models (future implementation)
├── resolvers/       # GraphQL resolvers
├── schema/          # GraphQL schema definitions
├── services/        # Business logic services (future implementation)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

### Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server
npm run dev:watch   # Development with file watching
```

### Code Style

- TypeScript with strict mode enabled
- ESLint and Prettier configuration (to be added)
- Path aliases for clean imports (`@/` for src directory)

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Configure production database
3. Set up Firebase production project
4. Configure production secrets
5. Set up monitoring and logging
6. Configure reverse proxy (nginx)
7. Set up SSL certificates
8. Configure backup strategies

### Docker Support

Docker configuration can be added for containerized deployment.

## 📊 Monitoring

### Health Check

The API provides a health check endpoint at `/health`:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### Logging

Structured logging with Winston:
- Console output in development
- File logging in production
- Error tracking and monitoring ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (when test suite is implemented)
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the GraphQL schema in GraphQL Studio

## 🗺 Roadmap

### Phase 1 (Current)
- ✅ Core GraphQL API
- ✅ User authentication
- ✅ Trip management
- ✅ Booking system
- ✅ Payment integration

### Phase 2 (Next)
- [ ] Real-time subscriptions implementation
- [ ] Advanced trip search with filters
- [ ] Driver verification workflow
- [ ] Push notifications
- [ ] Analytics and reporting

### Phase 3 (Future)
- [ ] Mobile app integration
- [ ] Admin dashboard
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Corporate booking features

---

Built with ❤️ for the Y3nko Ride platform
