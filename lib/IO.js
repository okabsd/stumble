'use strict';

const defaults = require('./gutil').defaults;

const DEFAULT_LINES = {
  output: true,
  input: true
};

module.exports = class IO {
  constructor (parent) {
    this.parent = parent;

    this.input = null;
    this.output = null;
  }

  establish (lines) {
    if (!this.parent.client || !this.parent.client.connection)
      return false;

    lines = defaults(lines, DEFAULT_LINES);

    if (lines.input)
      this.input = this.parent.client.connection.inputStream(lines.inputOptions);

    if (lines.output)
      this.output = this.parent.client.connection.outputStream(lines.outputFrom);

    return true;
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
