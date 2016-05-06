'use strict';

const gutil = require('../gutil');
const defaults = gutil.defaults;
const minmax = gutil.minmax;

const buffered = {
  handle: 'messenger::buffered',
  exec: function buffered (data) {
    const parts = data.parts;
    const bufferSize = (data.bufferSize > 0) ? data.bufferSize : Infinity;

    let buffer = [];
    let bytes = 0;
    let partN = 0;

    while (parts.length) {
      const next = parts.shift();
      const nextString = data.createPartString(next, partN);
      const nextLength = nextString.length;

      if (nextLength > bufferSize)
        return data.error({
          message: 'Individual message part exceeded buffer size.',
          part: next
        });

      if (bytes + nextLength > bufferSize) {
        data.send(buffer.join(''));

        buffer = [];
        bytes = 0;
      }

      buffer.push(nextString);
      bytes += nextLength;

      partN++;
    }

    if (buffer.length)
      data.send(buffer.join(''));
  }
};

const textlength = {
  handle: 'messenger::textlength',
  exec: function textlength (data) {
    const exts = this.config.extensions;
    const TML = defaults(exts.messenger && exts.messenger.textmessagelength, 5000);
    const cushion = defaults(data.cushion, 0);

    return (TML < 1) ? TML : minmax(1, TML - cushion, Infinity);
  }
};

module.exports = {
  handle: 'messenger',
  extensions: [buffered, textlength]
};
