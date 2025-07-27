import { scalarResolvers } from '../schema';
import { userResolvers } from './userResolvers';
import { tripResolvers } from './tripResolvers';
import { bookingResolvers } from './bookingResolvers';
import { paymentResolvers } from './paymentResolvers';
import { reviewResolvers } from './reviewResolvers';
import { notificationResolvers } from './notificationResolvers';

const resolvers = {
  ...scalarResolvers,
  
  Query: {
    ...userResolvers.Query,
    ...tripResolvers.Query,
    ...bookingResolvers.Query,
    ...paymentResolvers.Query,
    ...reviewResolvers.Query,
    ...notificationResolvers.Query,
  },

  Mutation: {
    ...userResolvers.Mutation,
    ...tripResolvers.Mutation,
    ...bookingResolvers.Mutation,
    ...paymentResolvers.Mutation,
    ...reviewResolvers.Mutation,
    ...notificationResolvers.Mutation,
  },

  Subscription: {
    ...tripResolvers.Subscription,
    ...bookingResolvers.Subscription,
    ...notificationResolvers.Subscription,
  },

  // Type resolvers
  User: userResolvers.User,
  DriverProfile: userResolvers.DriverProfile,
  Vehicle: userResolvers.Vehicle,
  Trip: tripResolvers.Trip,
  Booking: bookingResolvers.Booking,
  Payment: paymentResolvers.Payment,
  Review: reviewResolvers.Review,
  Notification: notificationResolvers.Notification,
};

export default resolvers;
