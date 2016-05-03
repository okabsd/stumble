'use strict';

const defaults = require('./gutil').defaults;

const DEFAULT_LINES = {
  output: true,
  input: true
};

module.exports = class IO {
  constructor () {
    this.input = null;
    this.output = null;
  }

  nullify (lines) {
    lines = defaults(lines, DEFAULT_LINES);

    if (this.output && lines.output) {
      this.output.close();
      this.output = null;
    }

    if (this.input && lines.input) {
      if (!this.input.ended) this.input.end();
      this.input = null;
    }
  }
};
