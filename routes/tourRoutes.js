const express = require('express');
const tourController = require('../controllers/tourController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Internal route — called by Review Service to update ratings (no auth needed, internal only)
router.patch('/:id/ratings', tourController.updateRatings);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);
router.route('/monthly-plan/:year').get(protect, restrictTo('admin', 'lead-guide', 'guide'), tourController.getMonthlyPlan);
router.route('/tours-within/:distance/center/:lating/unit/:unit').get(tourController.getToursWithin);
router.route('/distance/:lating/unit/:unit').get(tourController.getDistances);
router.route('/slug/:slug').get(tourController.getTourBySlug);

router.route('/')
  .get(tourController.getAllTours)
  .post(protect, restrictTo('admin', 'lead-guide'), tourController.createTour);

router.route('/:id')
  .get(tourController.getTour)
  .patch(protect, restrictTo('admin', 'lead-guide'), tourController.uploadTourImages, tourController.resizeTourImages, tourController.updateTour)
  .delete(protect, restrictTo('admin', 'lead-guide'), tourController.deleteTour);

module.exports = router;
