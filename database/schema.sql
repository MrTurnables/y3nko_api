-- Y3nko Ride Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_type AS ENUM ('driver', 'rider', 'both');
CREATE TYPE background_check_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE vehicle_type AS ENUM ('sedan', 'suv', 'minivan', 'bus');
CREATE TYPE trip_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE trip_type AS ENUM ('one_way', 'round_trip');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Users table (both drivers and riders) - Simplified for Firebase Auth integration
CREATE TABLE users (
    id VARCHAR(128) PRIMARY KEY, -- Firebase UID
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_image_url TEXT,
    user_type user_type NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    firebase_custom_claims JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver profiles
CREATE TABLE driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(128) REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    license_image_url TEXT, -- UploadThing URL
    vehicle_id UUID,
    background_check_status background_check_status DEFAULT 'pending',
    driving_experience_years INTEGER,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_trips INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle information
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id VARCHAR(128) REFERENCES users(id),
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(30) NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type vehicle_type NOT NULL,
    passenger_capacity INTEGER NOT NULL,
    insurance_policy_number VARCHAR(100),
    insurance_expiry DATE,
    vehicle_images JSONB, -- UploadThing URLs array
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes and trips
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id VARCHAR(128) REFERENCES users(id) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    origin_coordinates POINT NOT NULL,
    destination_coordinates POINT NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    estimated_arrival_time TIMESTAMP,
    available_seats INTEGER NOT NULL,
    price_per_seat DECIMAL(10,2) NOT NULL,
    trip_status trip_status DEFAULT 'scheduled',
    trip_type trip_type DEFAULT 'one_way',
    return_departure_time TIMESTAMP,
    description TEXT,
    firebase_realtime_path VARCHAR(255), -- Firebase Realtime DB path for live tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) NOT NULL,
    rider_id VARCHAR(128) REFERENCES users(id) NOT NULL,
    seats_booked INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    booking_status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'paystack',
    pickup_location VARCHAR(255),
    pickup_coordinates POINT,
    special_requests TEXT,
    paystack_reference VARCHAR(255), -- Paystack transaction reference
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment transactions
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'paystack',
    paystack_reference VARCHAR(255) NOT NULL,
    paystack_transaction_id VARCHAR(255),
    payment_status payment_status DEFAULT 'pending',
    gateway_response JSONB, -- Store full Paystack response
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews and ratings
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) NOT NULL,
    reviewer_id VARCHAR(128) REFERENCES users(id) NOT NULL,
    reviewee_id VARCHAR(128) REFERENCES users(id) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications (complementing Firebase Cloud Messaging)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(128) REFERENCES users(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    fcm_message_id VARCHAR(255), -- Firebase Cloud Messaging ID
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for vehicle_id in driver_profiles
ALTER TABLE driver_profiles ADD CONSTRAINT fk_driver_profiles_vehicle_id 
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX idx_driver_profiles_is_available ON driver_profiles(is_available);
CREATE INDEX idx_driver_profiles_background_check_status ON driver_profiles(background_check_status);

CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_is_verified ON vehicles(is_verified);

CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_origin_city ON trips(origin_city);
CREATE INDEX idx_trips_destination_city ON trips(destination_city);
CREATE INDEX idx_trips_departure_time ON trips(departure_time);
CREATE INDEX idx_trips_trip_status ON trips(trip_status);
CREATE INDEX idx_trips_available_seats ON trips(available_seats);
CREATE INDEX idx_trips_price_per_seat ON trips(price_per_seat);

CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_rider_id ON bookings(rider_id);
CREATE INDEX idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_paystack_reference ON payments(paystack_reference);
CREATE INDEX idx_payments_payment_status ON payments(payment_status);

CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create spatial indexes for location-based queries
CREATE INDEX idx_trips_origin_coordinates ON trips USING GIST (origin_coordinates);
CREATE INDEX idx_trips_destination_coordinates ON trips USING GIST (destination_coordinates);
CREATE INDEX idx_bookings_pickup_coordinates ON bookings USING GIST (pickup_coordinates);

-- Create composite indexes for common query patterns
CREATE INDEX idx_trips_search ON trips(origin_city, destination_city, departure_time, trip_status);
CREATE INDEX idx_bookings_user_status ON bookings(rider_id, booking_status, created_at);
CREATE INDEX idx_driver_availability ON driver_profiles(is_available, background_check_status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate distance between two points (in kilometers)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT)
RETURNS FLOAT AS $$
DECLARE
    R FLOAT := 6371; -- Earth's radius in kilometers
    dLat FLOAT;
    dLon FLOAT;
    a FLOAT;
    c FLOAT;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    a := sin(dLat/2) * sin(dLat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon/2) * sin(dLon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
-- INSERT INTO users (id, email, phone, first_name, last_name, user_type) VALUES
-- ('test-driver-1', 'driver@example.com', '+1234567890', 'John', 'Driver', 'driver'),
-- ('test-rider-1', 'rider@example.com', '+1234567891', 'Jane', 'Rider', 'rider');
