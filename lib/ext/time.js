'use strict';

module.exports = {
  handle: 'time',
  init: stumble => {
    stumble.space.set('starttime', Date.now());
  },
  term: stumble => {
    stumble.space.delete('starttime');
  },
  commands: ['time', 'uptime'].map(cmd =>require(`./cmd/${cmd}`))
};
