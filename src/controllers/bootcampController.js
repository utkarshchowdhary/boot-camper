const NodeCache = require('node-cache');
const multer = require('multer');
const sharp = require('sharp');
const Bootcamp = require('../models/bootcampModel');
const CustomError = require('../utils/CustomError');
const asyncHandler = require('../middleware/async');
const AuxiliaryTraits = require('../utils/AuxiliaryTraits');
const geocoder = require('../utils/geocoder');

const cache = new NodeCache({ stdTTL: 3600, useClones: false });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new CustomError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  limits: {
    fileSize: 5000000,
  },
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.initiateUpload = upload.single('imageCover');

exports.resizeImageCover = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  req.file.buffer = await sharp(req.file.buffer)
    .resize(1084, 610)
    .png()
    .toBuffer();

  next();
});

exports.uploadImageCover = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new CustomError('Please select an image to upload', 400));
  }

  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new CustomError('No bootcamp found with that ID', 404));
  }

  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError(
        'You are not authorized to upload coverImage for this bootcamp',
        401
      )
    );
  }

  bootcamp.imageCover = req.file.buffer;
  await bootcamp.save();

  res.status(200).json({
    status: 'success',
  });
});

exports.getImageCover = asyncHandler(async (req, res, next) => {
  const imgBuffer = cache.get(req.params.id);

  if (imgBuffer) {
    res.set('Content-Type', 'image/png');
    res.send(imgBuffer);
    return;
  }

  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp || !bootcamp.imageCover) {
    return next(
      new CustomError('No bootcamp or coverImage found with that ID', 404)
    );
  }

  cache.set(bootcamp.id, bootcamp.imageCover);

  res.set('Content-Type', 'image/png');
  res.send(bootcamp.imageCover);
});

exports.deleteImageCover = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new CustomError('No bootcamp found with that ID', 404));
  }

  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError(
        'You are not authorized to delete coverImage for this bootcamp',
        401
      )
    );
  }

  bootcamp.imageCover = undefined;
  await bootcamp.save();

  cache.del(bootcamp.id);

  res.status(200).json({
    status: 'success',
  });
});

exports.createBootcamp = asyncHandler(async (req, res, next) => {
  const publishedBootcamp = Bootcamp.findOne({ user: req.user.id });

  if (publishedBootcamp && req.user.role !== 'admin') {
    return next(new CustomError('You have already published a bootcamp', 400));
  }

  const bootcamp = await Bootcamp.create({ ...req.body, user: req.user.id });

  res.status(201).json({
    status: 'success',
    data: bootcamp,
  });
});

exports.getAllBootcamps = asyncHandler(async (req, res, next) => {
  const features = new AuxiliaryTraits(Bootcamp.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const bootcamps = await features.query;

  res.status(200).json({
    status: 'success',
    results: bootcamps.length,
    data: bootcamps,
  });
});

exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id)
    .populate('courses')
    .populate('reviews');

  if (!bootcamp) {
    return next(new CustomError('No bootcamp found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: bootcamp,
  });
});

exports.updateBootcamp = asyncHandler(async (req, res, next) => {
  const updates = Object.keys(req.body);

  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new CustomError('No bootcamp found with that ID', 404));
  }

  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError('You are not authorized to update this bootcamp', 401)
    );
  }

  updates.forEach((update) => (bootcamp[update] = req.body[update]));

  await bootcamp.save();

  res.status(200).json({
    status: 'success',
    data: bootcamp,
  });
});

exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp) {
    return next(new CustomError('No bootcamp found with that ID', 404));
  }

  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new CustomError('You are not authorized to delete this bootcamp', 401)
    );
  }

  await bootcamp.remove();

  cache.del(bootcamp.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getBootcampsWithin = asyncHandler(async (req, res, next) => {
  const { zipcode, distance, unit } = req.params;

  const loc = await geocoder.geocode(zipcode);

  const lng = loc[0].longitude;
  const lat = loc[0].latitude;

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: bootcamps.length,
    data: bootcamps,
  });
});
