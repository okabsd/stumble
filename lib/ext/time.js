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
  exec: data => void data.user.channel.sendMessage(new Date().toUTCString()),
  info: () => `<pre>
USAGE: time

Displays the UTC date and time.
  </pre>`
};

const uptime = {
  handle: 'uptime',
  exec: function exec (data) {
    const start = this.space.get('time.start');
    const result = elapsed(start);

    data.user.channel.sendMessage(`Total time running: ${result}`);
  },
  info: () => `<pre>
USAGE: uptime

Reports the current uptime of the bot.
  </pre>`
};

module.exports = {
  handle: 'time',
  init: stumble => stumble.space.set('time.start', Date.now()),
  term: stumble => stumble.space.delete('time.start'),
  commands: [time, uptime]
};
