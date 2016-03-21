'use strict';

const is = {
  truth: () => true,
  function: $ => typeof $ === 'function',
  string: $ => typeof $ === 'string',
  strings: $ => Array.isArray($) && $.every(is.string),
  assign: (target, sample, keyset) => {
    for (const key in sample) if (sample.hasOwnProperty(key)) {
      const value = sample[key];
      if (keyset[key] && keyset[key](value)) target[key] = value;
    }
  }
};

module.exports = is;
