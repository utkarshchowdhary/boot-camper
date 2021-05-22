const express = require('express')
const bootcampController = require('../controllers/bootcampController')
const authController = require('../controllers/authController')
const courseRouter = require('./courseRoutes')
const reviewRouter = require('./reviewRoutes')

const router = express.Router()

router.use('/:bootcampId/courses', courseRouter)
router.use('/:bootcampId/reviews', reviewRouter)

router
  .route('/radius/:zipcode/:distance/:unit')
  .get(bootcampController.getBootcampsWithin)

router
  .route('/')
  .get(bootcampController.getAllBootcamps)
  .post(
    authController.protect,
    authController.restrictTo('publisher', 'admin'),
    bootcampController.createBootcamp
  )

router
  .route('/:id')
  .get(bootcampController.getBootcamp)
  .patch(
    authController.protect,
    authController.restrictTo('publisher', 'admin'),
    bootcampController.updateBootcamp
  )
  .delete(
    authController.protect,
    authController.restrictTo('publisher', 'admin'),
    bootcampController.deleteBootcamp
  )

router
  .route('/:id/coverimage')
  .get(bootcampController.getImageCover)
  .post(
    authController.protect,
    authController.restrictTo('publisher', 'admin'),
    bootcampController.initiateUpload,
    bootcampController.resizeImageCover,
    bootcampController.uploadImageCover
  )
  .delete(
    authController.protect,
    authController.restrictTo('publisher', 'admin'),
    bootcampController.deleteImageCover
  )

module.exports = router
