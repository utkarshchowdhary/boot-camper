const Course = require('../models/courseModel')
const Bootcamp = require('../models/bootcampModel')
const AppError = require('../utils/AppError')
const asyncHandler = require('../middleware/async')
const Features = require('../utils/Features')

exports.createCourse = asyncHandler(async (req, res, next) => {
  if (!req.params.bootcampId) {
    return next(new AppError('Please specify bootcampId as a parameter', 400))
  }

  const bootcamp = await Bootcamp.findById(req.params.bootcampId)

  if (!bootcamp) {
    return next(new AppError('No bootcamp found with that ID', 404))
  }

  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError(
        'You are not authorized to add a course to this bootcamp',
        401
      )
    )
  }

  const course = await Course.create({
    ...req.body,
    bootcamp: req.params.bootcampId,
    user: req.user.id
  })

  res.status(201).json({
    status: 'success',
    data: course
  })
})

exports.getAllCourses = asyncHandler(async (req, res, next) => {
  let filter = {}
  if (req.params.bootcampId) filter = { bootcamp: req.params.bootcampId }

  const features = new Features(Course.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()

  const courses = await features.query

  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: courses
  })
})

exports.getCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id)

  if (!course) {
    return next(new AppError('No course found with that ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: course
  })
})

exports.updateCourse = asyncHandler(async (req, res, next) => {
  const updates = Object.keys(req.body)

  const course = await Course.findById(req.params.id)

  if (!course) {
    return next(new AppError('No course found with that ID', 404))
  }

  if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You are not authorized to update this course', 401)
    )
  }

  updates.forEach((update) => (course[update] = req.body[update]))

  await course.save()

  res.status(200).json({
    status: 'success',
    data: course
  })
})

exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id)

  if (!course) {
    return next(new AppError('No course found with that ID', 404))
  }

  if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError('You are not authorized to delete this course', 401)
    )
  }

  await course.remove()

  res.status(204).json({
    status: 'success',
    data: null
  })
})
