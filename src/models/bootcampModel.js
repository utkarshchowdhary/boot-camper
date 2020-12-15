const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');
const geocoder = require('../utils/geocoder');

const bootcampSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A bootcamp must have a name'],
      unique: true,
      trim: true,
      maxlength: [
        40,
        'A bootcamp name must have less or equal then 40 characters',
      ],
      minlength: [
        10,
        'A bootcamp name must have more or equal then 10 characters',
      ],
    },
    slug: String,
    description: {
      type: String,
      required: [true, 'A bootcamp must have a description'],
      maxlength: [500, 'Description can not be more than 500 characters'],
    },
    website: {
      type: String,
      lowercase: true,
      validate: [validator.isURL, 'Please provide a valid URL'],
    },
    address: {
      type: String,
      required: [true, 'A bootcamp must have an address'],
    },
    location: {
      //? GeoJSON Point
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      formattedAddress: String,
      street: String,
      city: String,
      state: String,
      zipcode: String,
      country: String,
    },
    careers: {
      type: [String],
      required: true,
      enum: [
        'Web Development',
        'Mobile Development',
        'UI/UX',
        'Data Science',
        'Business',
        'Other',
      ],
    },
    imageCover: {
      type: Buffer,
    },
    averageRating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating must can not be more than 10'],
      set: (val) => Math.round(val * 10) / 10,
    },
    averageCost: {
      type: Number,
      set: (val) => Math.round(val * 10) / 10,
    },
    housing: {
      type: Boolean,
      default: false,
    },
    jobAssistance: {
      type: Boolean,
      default: false,
    },
    jobGuarantee: {
      type: Boolean,
      default: false,
    },
    acceptGi: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A Bootcamp must belong to a User.'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.imageCover;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.imageCover;
      },
    },
  }
);

bootcampSchema.index({ slug: 1 });
bootcampSchema.index({ location: '2dsphere' });

bootcampSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'bootcamp',
});

bootcampSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'bootcamp',
});

bootcampSchema.pre('save', function (next) {
  if (!this.isModified('name')) return next();

  this.slug = slugify(this.name, { lower: true });
  next();
});

// Geocode & create location field
bootcampSchema.pre('save', async function (next) {
  if (!this.isModified('address')) return next();

  const loc = await geocoder.geocode(this.address);

  this.location = {
    type: 'Point',
    coordinates: [loc[0].longitude, loc[0].latitude],
    formattedAddress: loc[0].formattedAddress,
    street: loc[0].streetName,
    city: loc[0].city,
    state: loc[0].stateCode,
    zipcode: loc[0].zipcode,
    country: loc[0].countryCode,
  };

  next();
});

// Cascade delete courses when a bootcamp is deleted
bootcampSchema.pre('remove', async function (next) {
  await this.model('Course').deleteMany({ bootcamp: this.id });
  next();
});

const Bootcamp = mongoose.model('Bootcamp', bootcampSchema);

module.exports = Bootcamp;
