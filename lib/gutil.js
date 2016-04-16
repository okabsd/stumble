'use strict';

const gutil = {};

gutil.minmax = (lower, value, upper) => {
  return value < lower ? lower : value > upper ? upper : value;
};

gutil.defaults = function defaults () {
  const length = arguments.length;

  for (let i = 0; i < length; i++) {
    const arg = arguments[i];

    if (typeof arg !== 'undefined') return arg;
  }
};

module.exports = gutil;
