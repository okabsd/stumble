'use strict';

const pad = num => num < 10 ? '0' + num : num;
const elapsed = start => {
  const difference = (Date.now() - start) / 1000;
  const hours = (difference / 3600) >> 0;
  const minutes = ((difference % 3600) / 60) >> 0;
  const seconds = (difference % 60) >> 0;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const time = {
  handle: 'time',
  exec: data => data.user.sendMessage(new Date().toUTCString())
};

const uptime = {
  handle: 'uptime',
  exec: function exec (data) {
    const start = this.space.get('starttime');
    const result = elapsed(start);

    data.user.sendMessage(`Total time running: ${result}`);
  }
};

module.exports = {
  handle: 'time',
  init: stumble => stumble.space.set('starttime', Date.now()),
  term: stumble => stumble.space.delete('starttime'),
  commands: [time, uptime]
};
