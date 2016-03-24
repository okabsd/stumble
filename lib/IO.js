'use strict';

module.exports = class IO {
  constructor () {
    this.input = null;
    this.output = null;
  }

  nullify (targets) {
    targets = targets || 'oi';

    if (this.output && targets.includes('o')) {
      this.output.close();
      this.output = null;
    }

    if (this.input && targets.includes('i')) {
      this.input.end();
      this.input = null;
    }
  }
};
