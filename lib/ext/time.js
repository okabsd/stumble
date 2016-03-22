'use strict';

module.exports = {
  handle: 'time',
  init: stumble => {
    stumble.space.set('starttime', Date.now());

    ['time'].forEach(cmd => {
      stumble.define(require(`./cmd/${cmd}`));
    });
  }
};
