'use strict';

module.exports = {
  handle: 'time',
  exec: data => {
    data.user.sendMessage(new Date().toUTCString());
  }
};
