const Review = require('../models/reviewModel');
const Bootcamp = require('../models/bootcampModel');
const CustomError = require('../utils/CustomError');
const asyncHandler = require('../middleware/async');
const AuxiliaryTraits = require('../utils/AuxiliaryTraits');

exports.createReview = asyncHandler(async (req, res, next) => {
  const bootcampId = req.params.bootcampId;
  if (!bootcampId) {
    return next(
      new CustomError('Please specify bootcampId as a parameter', 400)
    );
  }

  const bootcamp = await Bootcamp.findById(bootcampId);
  if (!bootcamp) {
    return next(new CustomError('No bootcamp found with that ID', 404));
  }

  const review = await Review.create({
    ...req.body,
    bootcamp: bootcampId,
    user: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    data: review,
  });
});

exports.getAllReviews = asyncHandler(async (req, res, next) => {
  let filter = {};
  if (req.params.bootcampId) filter = { bootcamp: req.params.bootcampId };

  const features = new AuxiliaryTraits(Review.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const reviews = await features.query;

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: reviews,
  });
});

exports.getReview = asyncHandler(async (req, res, next) => {
  const reviewId = req.params.id;
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new CustomError('No review found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: review,
  });
});

exports.updateReview = asyncHandler(async (req, res, next) => {
  const reviewId = req.params.id;
  const reviewProps = req.body;
  const updates = Object.keys(reviewProps);

  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new CustomError('No review found with that ID', 404));
  }

  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError('You are not authorized to update this review', 401)
    );
  }

  updates.forEach((update) => (review[update] = reviewProps[update]));

  await review.save();

  res.status(200).json({
    status: 'success',
    data: review,
  });
});

exports.deleteReview = asyncHandler(async (req, res, next) => {
  const reviewId = req.params.id;
  const review = await Review.findById(reviewId);

  if (!review) {
    return next(new CustomError('No review found with that ID', 404));
  }

  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError('You are not authorized to delete this review', 401)
    );
  }

  await review.remove();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
