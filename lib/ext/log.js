'use strict';

const clog = require('util').log;

function log (message, user) {
  clog(`<${user.name}> ${message}`);
}

module.exports = {
  handle: 'log',
  init: stumble => {
    stumble.on('message', log);
  },
  term: stumble => {
    stumble.removeListener('message', log);
  }
};
