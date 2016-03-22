'use strict';

module.exports = {
  handle: 'time',
  init: stumble => {
    stumble.space.set('starttime', Date.now());
  },
  commands: ['time', 'uptime'].map(cmd =>require(`./cmd/${cmd}`))
};
