'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');

const gutil = { clog: util.log };

gutil.yesno = (bool) => bool ? 'Yes' : 'No';

gutil.pad = (num) => num < 10 ? '0' + num : num;

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

gutil.clone = (object) => {
  const obj = {};
  let k;

  for (k in object) if (object.hasOwnProperty(k))
    obj[k] = object[k];

  return obj;
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

gutil.leading = (string, sep) => {
  const index = string.indexOf(sep);

  return (
    (index > -1)
    ? {
      lead: string.substring(0, index),
      trail: string.substring(index + sep.length)
    }
    : {
      lead: '',
      trail: ''
    }
  );
};

module.exports = gutil;
