'use strict';

module.exports = {
  handle: 'time',
  block: data => {
    data.user.sendMessage(new Date().toUTCString());
  }
};
