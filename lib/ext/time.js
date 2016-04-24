'use strict';

const Timer = require('../Timer');
const leading = require('../gutil').leading;

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
    const result = Timer.elapsed(start);

    data.user.channel.sendMessage(`Total time running: ${result}`);
  },
  info: () => `<pre>
USAGE: uptime

Reports the current uptime of the bot.
  </pre>`
};

const actions = {
  start: (obj, timers, id) => {
    if (timers.has(id))
      return `Timer [ ${id} ] already exists.`;

    timers.set(id, new Timer(id));

    return `Timer [ ${id} ] started.`;
  },
  mark: obj => obj.mark() ? `Timer [ ${obj.id} ] marked!` : 'Timer has already finished.',
  stop: obj => obj.stop() ? `Timer [ ${obj.id} ] finished.` : 'Timer has already finished.',
  show: obj => obj.report(),
  clear: (obj, timers) => {
    timers.delete(obj.id);
    return `Timer [ ${obj.id} ] cleared.`;
  }
};

const timer = {
  handle: 'timer',
  exec: function timer (data) {
    if (!data.message) return;

    const message = leading(data.message, ' ');

    if (!message.trail)
      return data.user.sendMessage('Timer name is required.');

    const action = message.lead;
    const id = message.trail;

    if (actions.hasOwnProperty(action)) {
      const timers = this.space.get('time.timers');
      const exists = timers.has(id);

      if (action !== 'start' && !exists)
        return void data.user.sendMessage(`Timer [ ${id} ] does not exist.`);

      data.user.sendMessage(actions[action](timers.get(id), timers, id));
    } else data.user.sendMessage(`Invalid action [ ${action} ].`);
  },
  info: () => `<pre>
USAGE: timers ACTION ID

Timer manipulation, based on certain actions.
Timers are always referenced by their unique ID.

ACTIONS:
  start - Initializes a new timer.
  mark - Marks a point on the timer.
  stop - Ends the timer.
  show - Displays a report for the timer.
  clear - Destroys the timer.
</pre>`
};

module.exports = {
  handle: 'time',
  init: stumble => {
    stumble.space.set('time.start', Date.now());
    stumble.space.set('time.timers', new Map());
  },
  term: stumble => {
    stumble.space.delete('time.start');
    stumble.space.delete('time.timers');
  },
  commands: [time, uptime, timer]
};
