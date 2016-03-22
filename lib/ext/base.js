'use strict';

const echo = {
  handle: 'echo',
  exec: data => data.user.sendMessage(data.message)
};

module.exports = {
  handle: 'base',
  commands: [echo]
};
