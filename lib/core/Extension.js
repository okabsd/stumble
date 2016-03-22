'use strict';

const is = require('./is');

module.exports = class Extension {
  constructor (partial) {
    is.assign(this, partial, {
      handle: is.string,
      version: is.string,
      hooks: is.strings,
      exec: is.function,
      term: is.function
    });
  }
};
