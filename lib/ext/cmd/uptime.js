'use strict';

function pad (num) {
  return num < 10 ? '0' + num : num;
}

function uptime (start) {
  const now = Date.now();
  const difference = (now - start) / 1000;
  const hours = (difference / 3600) >> 0;
  const minutes = ((difference % 3600) / 60) >> 0;
  const seconds = (difference % 60) >> 0;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function block (data) {
  const start = this.space.get('starttime');
  const elapsed = uptime(start);

  data.user.sendMessage(`Total time running: ${elapsed}`);
}

module.exports = {
  handle: 'uptime', block
};
