const crypto = require('crypto')
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Please provide your name!']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email!'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Please provide your password!'],
      minlength: 8,
      select: false,
      validate: {
        validator: function (val) {
          return !val.toLowerCase().includes('password')
        },
        message: 'Password cannot contain "password"!'
      }
    },
    avatar: Buffer,
    role: {
      type: String,
      enum: {
        values: ['user', 'publisher', 'admin'],
        message: 'Role is either: user, publisher or admin'
      },
      default: 'user'
    },
    passwordChangedAt: Date,
    tokens: [
      {
        token: {
          type: String,
          required: true
        }
      }
    ],
    passwordResetToken: String,
    passwordResetExpires: Date
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id
        delete ret.password
        delete ret.tokens
        delete ret.avatar
      }
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id
        delete ret.password
        delete ret.tokens
        delete ret.avatar
      }
    }
  }
)

userSchema.virtual('bootcamps', {
  ref: 'Bootcamp',
  localField: '_id',
  foreignField: 'user'
})

userSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'user'
})

userSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'user'
})

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  this.password = await bcrypt.hash(this.password, 12)

  next()
})

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next()

  this.passwordChangedAt = Date.now()
  next()
})

userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

userSchema.methods.changedPasswordAfter = function (JWTIssuedAt) {
  if (this.passwordChangedAt) {
    return JWTIssuedAt < parseInt(this.passwordChangedAt.getTime() / 1000)
  }

  return false
}

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex')

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  this.passwordResetExpires = Date.now() + 1000 * 10 * 60

  return resetToken
}

userSchema.pre('remove', async function (next) {
  await this.model('Bootcamp').deleteMany({ user: this.id })
  next()
})

const User = mongoose.model('User', userSchema)

module.exports = User
