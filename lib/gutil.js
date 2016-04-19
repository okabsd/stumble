'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

const gutil = { clog: util.log };

gutil.time = () => new Date().toLocaleTimeString({}, { hour12: false });

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

gutil.mkd = (pt, callback) => {
  pt = path.resolve(pt);

  fs.mkdir(pt, er => {
    if (!er) return callback(null);

    switch (er.code) {
    case 'ENOENT':
      gutil.mkd(path.dirname(pt), e => {
        if (e) return callback(e);
        gutil.mkd(pt, callback);
      });
      break;
    case 'EEXIST':
      callback(null);
      break;
    default:
      callback(er);
    }
  });
};

module.exports = gutil;
