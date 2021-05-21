const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: [true, 'Please add a title for the review'],
      maxlength: 100
    },
    review: {
      type: String,
      required: [true, 'Review can not be empty']
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating must can not be more than 10'],
      required: [true, 'Please add a rating between 1 and 10']
    },
    bootcamp: {
      type: mongoose.Schema.ObjectId,
      ref: 'Bootcamp',
      required: true
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id
      }
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id
      }
    }
  }
)

// Prevent user from submitting more than one review per bootcamp
reviewSchema.index({ bootcamp: 1, user: 1 }, { unique: true })

reviewSchema.statics.getAverageRating = async function (bootcampId) {
  const stats = await this.aggregate([
    {
      $match: { bootcamp: bootcampId }
    },
    {
      $group: {
        _id: '$bootcamp',
        averageRating: { $avg: '$rating' }
      }
    }
  ])

  if (stats[0]) {
    await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
      averageRating: stats[0].averageRating
    })
  } else {
    await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
      averageRating: undefined
    })
  }
}

reviewSchema.post('save', async function () {
  await this.constructor.getAverageRating(this.bootcamp)
})

reviewSchema.post('remove', async function () {
  await this.constructor.getAverageRating(this.bootcamp)
})

const Review = mongoose.model('Review', reviewSchema)

module.exports = Review
