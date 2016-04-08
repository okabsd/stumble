'use strict';

const gutil = {};

gutil.minmax = (lower, value, upper) => {
  return value < lower ? lower : value > upper ? upper : value;
};

module.exports = gutil;
