'use strict';

module.exports = class IO {
  constructor () {
    this.input = null;
    this.output = null;
  }

  close () {
    if (this.input) {
      this.input.close();
      this.input = null;
    }

    if (this.output) {
      this.output.close();
      this.input = null;
    }
  }
};
