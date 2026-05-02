const express = require('express');
const {
  getUsers,
  deleteUser,
  getUserDetails,
  getResetRequests,
  approveResetRequest,
  createNotification,
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply protect and authorize('admin') middleware to all routes in this file
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getUsers);

router.route('/reset-requests')
  .get(getResetRequests);

router.route('/reset-requests/:id/approve')
  .put(approveResetRequest);

router.route('/notifications')
  .post(createNotification);

router.route('/:id')
  .get(getUserDetails)
  .delete(deleteUser);

module.exports = router;
