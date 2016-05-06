'use strict';

const buffered = {
  handle: 'messenger::buffered',
  exec: function buffered (data) {
    const parts = data.parts;
    const bufferSize = data.bufferSize;

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

module.exports = {
  handle: 'messenger',
  extensions: [buffered]
};
