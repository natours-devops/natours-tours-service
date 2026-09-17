const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ;
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL;

const upload = multer({ storage: multer.memoryStorage(), fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Not an image! Please upload only images', 400), false);
}});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files?.imageCover || !req.files?.images) return next();

  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  req.body.images = [];
  await Promise.all(req.files.images.map(async (file, i) => {
    const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
    await sharp(file.buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 })
      .toFile(`public/img/tours/${filename}`);
    req.body.images.push(filename);
  }));
  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour);
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourBySlug = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug });
  if (!tour) return next(new AppError('No tour found with that slug', 404));

  const [enrichedGuides, reviewsRes] = await Promise.all([
    Promise.all(
      tour.guides.map(async (guideId) => {
        try {
          const { data } = await axios.get(`${AUTH_SERVICE_URL}/api/v1/users/internal/${guideId}`);
          const { name, role, photo } = data.data.data;
          return { _id: guideId, name, role, photo };
        } catch {
          return { _id: guideId };
        }
      })
    ),
    axios.get(`${REVIEW_SERVICE_URL}/api/v1/reviews/internal?tour=${tour._id}`).catch(() => ({ data: { data: { data: [] } } })),
  ]);

  const tourObj = tour.toObject();
  tourObj.guides = enrichedGuides;
  tourObj.reviews = reviewsRes.data.data.data;

  res.status(200).json({ status: 'success', data: { data: tourObj } });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    { $match: { ratingsAverage: { $gte: 4.3 } } },
    { $group: {
      _id: { $toUpper: '$difficulty' },
      numTours: { $sum: 1 },
      numRatings: { $sum: '$ratingsQuantity' },
      avgRating: { $avg: '$ratingsAverage' },
      avgPrice: { $avg: '$price' },
      minPrice: { $min: '$price' },
      maxPrice: { $max: '$price' },
    }},
  ]);
  res.status(200).json({ status: 'success', data: { stats } });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    { $unwind: '$startDates' },
    { $match: { startDates: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
    { $group: { _id: { $month: '$startDates' }, numTourStart: { $sum: 1 }, tours: { $push: '$name' } } },
    { $addFields: { month: '$_id' } },
    { $project: { _id: 0 } },
    { $sort: { numTourStart: -1 } },
    { $limit: 12 },
  ]);
  res.status(200).json({ status: 'success', data: { plan } });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, lating, unit } = req.params;
  const [lat, lng] = lating.split(',');
  if (!lat || !lng) return next(new AppError('Please provide latitude and longitude in format lat,lng', 400));
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } });
  res.status(200).json({ status: 'success', results: tours.length, data: { data: tours } });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { lating, unit } = req.params;
  const [lat, lng] = lating.split(',');
  if (!lat || !lng) return next(new AppError('Please provide latitude and longitude in format lat,lng', 400));
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  const distances = await Tour.aggregate([
    { $geoNear: { near: { type: 'Point', coordinates: [lng * 1, lat * 1] }, distanceField: 'distance', distanceMultiplier: multiplier } },
    { $project: { distance: 1, name: 1 } },
  ]);
  res.status(200).json({ status: 'success', data: { data: distances } });
});

// Internal endpoint called by Review Service to update tour ratings
exports.updateRatings = catchAsync(async (req, res, next) => {
  const { ratingsQuantity, ratingsAverage } = req.body;
  const tour = await Tour.findByIdAndUpdate(
    req.params.id,
    { ratingsQuantity, ratingsAverage },
    { new: true, runValidators: true }
  );
  if (!tour) return next(new AppError('No tour found with that ID', 404));
  res.status(200).json({ status: 'success', data: { data: tour } });
});
