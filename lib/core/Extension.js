'use strict';

const is = require('./is');

module.exports = class Extension {
  constructor (partial) {
    is.assign(this, partial, {
      handle: is.string,
      version: is.string,
      needs: is.strings,
      hooks: is.strings,
      block: is.function,
      cleanup: is.function
    });
  }
};
