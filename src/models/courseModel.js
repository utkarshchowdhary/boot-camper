const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: [true, 'Please add a course title'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    weeks: {
      type: Number,
      required: [true, 'Please add number of weeks'],
    },
    tuition: {
      type: Number,
      required: [true, 'Please add a tuition cost'],
    },
    minimumSkill: {
      type: String,
      required: [true, 'Please add a minimum skill'],
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    scholarshipAvailable: {
      type: Boolean,
      default: false,
    },
    bootcamp: {
      type: mongoose.Schema.ObjectId,
      ref: 'Bootcamp',
      required: [true, 'A Course must belong to a Bootcamp.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A Course must belong to a User.'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        delete ret._id;
      },
    },
  }
);

courseSchema.statics.getAverageCost = async function (bootcampId) {
  const stats = await this.aggregate([
    {
      $match: { bootcamp: bootcampId },
    },
    {
      $group: {
        _id: '$bootcamp',
        averageCost: { $avg: '$tuition' },
      },
    },
  ]);

  if (stats[0]) {
    await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
      averageCost: stats[0].averageCost,
    });
  } else {
    await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
      averageCost: undefined,
    });
  }
};

courseSchema.post('save', async function () {
  await this.constructor.getAverageCost(this.bootcamp);
});

courseSchema.post('remove', async function () {
  await this.constructor.getAverageCost(this.bootcamp);
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
