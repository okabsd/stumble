'use strict';

const echo = {
  handle: 'echo',
  block: data => data.user.sendMessage(data.message)
};

module.exports = {
  handle: 'base',
  commands: [echo]
};
