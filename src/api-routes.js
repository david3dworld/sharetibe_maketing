// Initialize express router
import express from 'express';
import passport from 'passport';

// Import user controller
import imageController from './imageController.js';
import userController from './userController.js';
import stripeController from './stripeController.js';
import listingController from './listingController.js';
import authController from './authController.js';
import timeSlotController from './timeSlotController.js';
import reviewController from './reviewController.js';
import transactionController from './transactionController.js';
import transitionController from './transitionController.js';
import availabilityController from './availabilityController.js';
import bookingsController from './bookingController.js';
import messageController from './messageController.js';
import passwordController from './passwordController.js';

export const router = express.Router();

// Set default API response
router.get('/', function (req, res) {
    res.json({
        message: 'Welcome to ffs',
    });
});

// Auth routes
router.route('/auth/token')
    .post(authController.token);

router.route('/auth/token')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), authController.get);

router.route('/auth/revoke')
    .post(authController.revoke);

// User routes
router.route('/api/users/show')
    .get(userController.show);

router.route('/api/current_user/show')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), userController.currentShow);

router.route('/api/current_user/create')
    .post(userController.create);

router.route('/api/current_user/update_profile')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), userController.update);
    
router.route('/api/current_user/change_password')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), userController.changePassword);

router.route('/api/current_user/change_email')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), userController.changeEmail);

// Passord reset handling
router.route('/api/password_reset/request')
    .post(passwordController.request);

router.route('/api/password_reset/reset')
    .post(passwordController.reset);

// Stripe routes
router.route('/api/stripe_account/fetch')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.fetchAccount);

router.route('/api/stripe_account/create')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.createAccount);

router.route('/api/stripe_account/update')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.updateAccount);

router.route('/api/stripe_account_links/create')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.createAccountLink);

router.route('/api/stripe_person/create')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.createPerson);

router.route('/api/stripe_setup_intents/create')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.createSetupIntent);

router.route('/api/stripe_customer/create')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.createCustomer);

router.route('/api/stripe_customer/add_payment_method')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.addPaymentMethod);

router.route('/api/stripe_customer/delete_payment_method')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), stripeController.deletePaymentMethod);

// Listing routes
router.route('/api/listings/query')
    .get(listingController.query);

router.route('/api/listings/show')
    .get(listingController.show);

router.route('/api/own_listings/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.ownQuery);

router.route('/api/own_listings/show')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.ownShow);

router.route('/api/own_listings/create_draft')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.createDraft);

router.route('/api/own_listings/update')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.update);

router.route('/api/own_listings/publish_draft')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.publishDraft);

router.route('/api/own_listings/close')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.close);

router.route('/api/own_listings/open')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.open);

// Availability exceptions
router.route('/api/availability_exceptions/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), availabilityController.query);

router.route('/api/availability_exceptions/create')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), availabilityController.create);

router.route('/api/availability_exceptions/delete')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), availabilityController.remove);

// Image routes
router.route('/api/images/upload')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), imageController.upload);

// Transaction routes
router.route('/api/transactions/show')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), transactionController.show);

router.route('/api/transactions/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), transactionController.query);

router.route('/api/transactions/initiate')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), transactionController.initiate);

router.route('/api/transactions/initiate_speculative')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), transactionController.initiateSpeculative);

router.route('/api/transactions/transition')
    .post(/*passport.authenticate('bearer', { session: false, failWithError: true }), */transactionController.transition);

// Transition routes
router.route('/api/process_transitions/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), transitionController.query);

// Bookings routes
router.route('/api/bookings/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), bookingsController.query);

// Timeslots routes
router.route('/api/timeslots/query')
    .get(timeSlotController.query);

// Review routes
router.route('/api/reviews/query')
    .get(reviewController.query);

router.route('/api/reviews/show')
    .get(reviewController.query);

// Message routes
router.route('/api/messages/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), messageController.query);

router.route('/api/messages/send')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), messageController.send);


// Integration API

router.route('/integration_api/users/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), userController.queryall);

router.route('/integration_api/users/update_profile')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), userController.updateProfile);

router.route('/integration_api/listings/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.query);

router.route('/integration_api/listings/update')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.update);

router.route('/integration_api/listings/close')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.close);

router.route('/integration_api/listings/open')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.open);

router.route('/integration_api/listings/approve')
    .post(passport.authenticate('bearer', { session: false, failWithError: true }), listingController.publishDraft);

router.route('/integration_api/transactions/query')
    .get(passport.authenticate('bearer', { session: false, failWithError: true }), transactionController.queryall);

    