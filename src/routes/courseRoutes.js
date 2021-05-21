const express = require('express')
const courseController = require('../controllers/courseController')
const authController = require('../controllers/authController')

const router = express.Router({ mergeParams: true })

router
  .route('/')
  .get(courseController.getAllCourses)
  .post(
    authController.protect,
    authController.restrictTo('publisher', 'admin'),
    courseController.createCourse
  )

router
  .route('/:id')
  .get(courseController.getCourse)
  .patch(
    authController.protect,
    authController.restrictTo('publisher', 'admin'),
    courseController.updateCourse
  )
  .delete(
    authController.protect,
    authController.restrictTo('publisher', 'admin'),
    courseController.deleteCourse
  )

module.exports = router
