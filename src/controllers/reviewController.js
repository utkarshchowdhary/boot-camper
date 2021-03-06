const Review = require('../models/reviewModel')
const Bootcamp = require('../models/bootcampModel')
const AppError = require('../utils/AppError')
const asyncHandler = require('../middleware/async')
const Features = require('../utils/Features')

exports.createReview = asyncHandler(async (req, res, next) => {
  const { bootcampId } = req.params

  if (!bootcampId) {
    return next(new AppError('No bootcampId specified', 400))
  }

  const bootcamp = await Bootcamp.findById(bootcampId)

  if (!bootcamp) {
    return next(new AppError('No bootcamp found with that ID', 404))
  }

  const review = await Review.create({
    ...req.body,
    bootcamp: bootcampId,
    user: req.user.id
  })

  res.status(201).json({
    status: 'success',
    data: review
  })
})

exports.getAllReviews = asyncHandler(async (req, res, next) => {
  const { bootcampId } = req.params
  let filter = {}

  if (bootcampId) filter = { bootcamp: bootcampId }

  const features = new Features(Review.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()

  const reviews = await features.query

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: reviews
  })
})

exports.getReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id)

  if (!review) {
    return next(new AppError('No review found with that ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: review
  })
})

exports.updateReview = asyncHandler(async (req, res, next) => {
  const updates = Object.keys(req.body)

  const review = await Review.findById(req.params.id)

  if (!review) {
    return next(new AppError('No review found with that ID', 404))
  }

  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You are not authorized to update this review', 401)
    )
  }

  updates.forEach((update) => (review[update] = req.body[update]))

  await review.save()

  res.status(200).json({
    status: 'success',
    data: review
  })
})

exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id)

  if (!review) {
    return next(new AppError('No review found with that ID', 404))
  }

  if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You are not authorized to delete this review', 401)
    )
  }

  await review.remove()

  res.status(204).json({
    status: 'success',
    data: null
  })
})
