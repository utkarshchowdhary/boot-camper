const crypto = require('crypto')
const { promisify } = require('util')
const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const AppError = require('../utils/AppError')
const sendEmail = require('../utils/sendEmail')
const asyncHandler = require('../middleware/async')

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

const createSendToken = async (user, statusCode, req, res) => {
  const token = signToken(user.id)

  user.tokens.push({ token })

  await user.save()

  const message = `Welcome to the app, ${user.name}. Let me know how you get along with the it.`

  if (statusCode === 201) {
    await sendEmail({
      email: user.email,
      subject: 'Thanks for joining in!',
      message
    })
  }

  res.cookie('authToken', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  })

  res.status(statusCode).json({
    status: 'success',
    token,
    data: user
  })
}

exports.signup = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body)

  createSendToken(user, 201, req, res)
})

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400))
  }

  const user = await User.findOne({ email }).select('+password')

  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password', 401))
  }

  createSendToken(user, 200, req, res)
})

exports.protect = asyncHandler(async (req, res, next) => {
  const token =
    req.headers.authorization && req.headers.authorization.startsWith('Bearer')
      ? req.headers.authorization.replace('Bearer ', '')
      : req.cookies?.authToken

  if (!token) {
    return next(
      new AppError('You are not logged in! Please login to gain access.', 401)
    )
  }

  // Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

  // Check if user still exists
  const currentUser = await User.findOne({
    _id: decoded.id,
    'tokens.token': token
  })

  if (!currentUser) {
    return next(
      new AppError('You are not logged in! Please login to gain access.', 401)
    )
  }

  // Check if user changed password after token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User Recently changed password! Please log in again.', 401)
    )
  }

  req.token = token
  req.user = currentUser
  next()
})

const clearCookie = (res) => {
  res.cookie('authToken', '', {
    expires: new Date(0),
    httpOnly: true
  })
  res.status(200).json({ status: 'success' })
}

exports.logout = asyncHandler(async (req, res, next) => {
  req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token)

  await req.user.save()
  clearCookie(res)
})

exports.logoutAll = asyncHandler(async (req, res, next) => {
  req.user.tokens = []

  await req.user.save()
  clearCookie(res)
})

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      )
    }

    next()
  }

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email })

  if (!user) {
    return next(new AppError('There is no user with that email address', 404))
  }

  const resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false })

  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/users/resetPassword/${resetToken}`

  const message = `Hello ${user.name} \n\nYou are receiving this email because you (or someone else) has requested to change password for your account. Please make a PATCH request to: \n\n ${resetUrl}`

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset!',
      message
    })

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    })
  } catch (err) {
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save({ validateBeforeSave: false })

    return next(new AppError('There was an error sending the email', 500))
  }
})

exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  })

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400))
  }

  user.password = req.body.password
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()

  createSendToken(user, 200, req, res)
})

exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password')

  if (!(await user.correctPassword(req.body.passwordCurrent))) {
    return next(new AppError('Your current password is wrong!', 401))
  }

  user.password = req.body.password
  await user.save()

  createSendToken(user, 200, req, res)
})
