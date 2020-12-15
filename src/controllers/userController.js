const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const CustomError = require('../utils/CustomError');
const asyncHandler = require('../middleware/async');
const AuxiliaryTraits = require('../utils/AuxiliaryTraits');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else
    cb(new CustomError('Not an image! Please upload only images.', 400), false);
};

const upload = multer({
  limits: {
    fileSize: 1000000,
  },
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.initiateUpload = upload.single('avatar');

exports.resizeAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();

  req.file.buffer = await sharp(req.file.buffer)
    .resize(500, 500)
    .png()
    .toBuffer();

  next();
});

exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new CustomError('Please select an image to upload', 400));
  }
  const userId = req.params.id;
  if (userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: req.file.buffer },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!user) {
      return next(new CustomError('No user found with that ID', 404));
    }
  } else {
    req.user.avatar = req.file.buffer;
    await req.user.save();
  }
  res.status(200).json({
    status: 'success',
  });
});

exports.getAvatar = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  if (userId) {
    const user = await User.findById(userId);
    if (!user || !user.avatar) {
      return next(new CustomError('No user/avatar found with that ID', 404));
    }
    res.set('Content-Type', 'image/png');
    res.send(user.avatar);
  } else {
    if (!req.user.avatar) {
      return next(new CustomError('No avatar associated with the user', 404));
    }
    res.set('Content-Type', 'image/png');
    res.send(req.user.avatar);
  }
});

exports.deleteAvatar = asyncHandler(async (req, res, next) => {
  if (req.params.id) {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new CustomError('No user found with that ID', 404));
    }
    user.avatar = undefined;
    await user.save();
  } else {
    req.user.avatar = undefined;
    await req.user.save();
  }
  res.status(200).json({
    status: 'success',
  });
});

exports.createUser = asyncHandler(async (req, res, next) => {
  const userProps = req.body;
  const user = await User.create(userProps);

  res.status(201).json({
    status: 'success',
    data: user,
  });
});

exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const features = new AuxiliaryTraits(User.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: users,
  });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const user = await User.findById(userId)
    .populate('bootcamps')
    .populate('courses')
    .populate('reviews');

  if (!user) return next(new CustomError('No user found with that ID', 404));

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const userProps = req.body;
  const updates = Object.keys(userProps);

  const user = await User.findById(userId);

  if (!user) return next(new CustomError('No user found with that ID', 404));

  updates.forEach((update) => (user[update] = userProps[update]));

  await user.save();

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const user = await User.findById(userId);

  if (!user) return next(new CustomError('No user found with that ID', 404));

  await user.remove();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getMe = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: req.user,
  });
});

exports.updateMe = asyncHandler(async (req, res, next) => {
  const userProps = req.body;
  const updates = Object.keys(userProps);
  const allowedUpdates = ['name', 'email'];

  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) return next(new CustomError('Invalid updates!', 400));

  updates.forEach((update) => (req.user[update] = userProps[update]));

  await req.user.save();

  res.status(200).json({
    status: 'success',
    data: req.user,
  });
});

exports.deleteMe = asyncHandler(async (req, res, next) => {
  await req.user.remove();

  const message = `Goodbye, ${req.user.name}. I hope to see you back sometime soon.`;
  await sendEmail({
    email: req.user.email,
    subject: 'Sorry to see you go!',
    message,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
