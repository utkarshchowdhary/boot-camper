const Course = require('../models/courseModel');
const Bootcamp = require('../models/bootcampModel');
const CustomError = require('../utils/CustomError');
const asyncHandler = require('../middleware/async');
const AuxiliaryTraits = require('../utils/AuxiliaryTraits');

exports.createCourse = asyncHandler(async (req, res, next) => {
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

  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError(
        'You are not authorized to add a course to this bootcamp',
        401
      )
    );
  }

  const course = await Course.create({
    ...req.body,
    bootcamp: bootcampId,
    user: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    data: course,
  });
});

exports.getAllCourses = asyncHandler(async (req, res, next) => {
  const bootcampId = req.params.bootcampId;
  let filter = {};
  if (bootcampId) filter = { bootcamp: bootcampId };

  const features = new AuxiliaryTraits(Course.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const courses = await features.query;

  res.status(200).json({
    status: 'success',
    results: courses.length,
    data: courses,
  });
});

exports.getCourse = asyncHandler(async (req, res, next) => {
  const courseId = req.params.id;
  const course = await Course.findById(courseId);

  if (!course) {
    return next(new CustomError('No course found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: course,
  });
});

exports.updateCourse = asyncHandler(async (req, res, next) => {
  const courseId = req.params.id;
  const courseProps = req.body;
  const updates = Object.keys(courseProps);

  const course = await Course.findById(courseId);

  if (!course) {
    return next(new CustomError('No course found with that ID', 404));
  }

  if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError('You are not authorized to update this course', 401)
    );
  }

  updates.forEach((update) => (course[update] = courseProps[update]));

  await course.save();

  res.status(200).json({
    status: 'success',
    data: course,
  });
});

exports.deleteCourse = asyncHandler(async (req, res, next) => {
  const courseId = req.params.id;
  const course = await Course.findById(courseId);

  if (!course) {
    return next(new CustomError('No course found with that ID', 404));
  }

  if (course.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError('You are not authorized to delete this course', 401)
    );
  }

  await course.remove();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
