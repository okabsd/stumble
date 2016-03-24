'use strict';

module.exports = class IO {
  constructor () {
    this.input = null;
    this.output = null;
  }

  close (target) {
    if (target) {
      if (this[target]) {
        this[target].end();
        this[target] = null;
      }
    } else {
      this.close('output');
      this.close('input');
    }
  }
};
