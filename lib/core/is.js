'use strict';

const is = {
  function: $ => typeof $ === 'function',
  string: $ => typeof $ === 'string',
  strings: $ => Array.isArray($) && $.every(is.string),

  assign: (target, sample, keyset) => {
    Object.keys(sample).forEach(key => {
      const value = sample[key];
      if (keyset[key] && keyset[key](value)) target[key] = value;
    });
  }
};

module.exports = is;
