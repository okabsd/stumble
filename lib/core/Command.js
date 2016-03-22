'use strict';

const is = require('./is');

module.exports = class Command {
  constructor (partial) {
    is.assign(this, partial, {
      handle: is.string,
      block: is.function
    });
  }
};
