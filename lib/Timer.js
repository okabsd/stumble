'use strict';

const gutil = require('./gutil');
const pad = gutil.pad;
const yesno = gutil.yesno;

module.exports = class Timer {
  constructor (id) {
    this.id = id;

    this.start = Date.now();
    this.marks = [];
    this.end = null;

    this.done = false;
  }

  mark () {
    if (this.done) return false;

    this.marks.push(Date.now());

    return true;
  }

  stop () {
    if (this.done) return false;

    this.end = Date.now();
    this.done = true;

    return true;
  }

  report () {
    return (`<pre>
Timer: [ ${this.id} ]

Active: ${yesno(!this.done)}
Elapsed: ${Timer.elapsed(this.start, this.end)}
Marks: ${
  this.marks.length
  ? '\n' + this.marks.map(mark => Timer.elapsed(this.start, mark)).join('\n')
  : 'None'
}
</pre>`);
  }

  static elapsed (start, end) {
    const difference = ((end || Date.now()) - start) / 1000;
    const hours = (difference / 3600) >> 0;
    const minutes = ((difference % 3600) / 60) >> 0;
    const seconds = (difference % 60) >> 0;

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
};
