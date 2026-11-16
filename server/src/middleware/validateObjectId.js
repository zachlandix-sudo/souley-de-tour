const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

module.exports = (...params) => (req, _res, next) => {
  for (const p of params.length ? params : ['id']) {
    if (req.params[p] && !mongoose.isValidObjectId(req.params[p])) {
      return next(new AppError(`Invalid ${p}.`, 400));
    }
  }
  next();
};
