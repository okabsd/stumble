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

    data.user.channel.sendMessage(start.report());
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
  mark: (obj, timers, id) => {
    if (id !== '*') return (
      obj.mark()
      ? `Timer [ ${obj.id} ] marked!`
      : `Timer [ ${obj.id} ] has already finished.`
    );

    timers.forEach(timer => timer.mark());
    return 'All timers marked.';
  },
  stop: (obj, timers, id) => {
    if (id !== '*') return (
      obj.stop()
      ? `Timer [ ${obj.id} ] finished.`
      : `Timer [ ${obj.id} ] has already finished.`
    );

    timers.forEach(timer => timer.stop());
    return 'All timers stopped.';
  },
  show: (obj, timers, id) => {
    if (id !== '*') return obj.report();

    // This can create messages that are too long for Mumble to display.
    return [...timers.values()].map(timer => timer.report()).join('');
  },
  clear: (obj, timers, id) => {
    if (id !== '*') {
      timers.delete(obj.id);
      return `Timer [ ${obj.id} ] cleared.`;
    }

    [...timers.keys()].forEach(key => timers.delete(key));
    return 'All timers cleared.';
  }
};

const timers = {
  handle: 'timers',
  aliases: ['timer'],
  exec: function timer (data) {
    if (!data.message) return void this.invoke('timerlist', data);

    const message = leading(data.message, ' ');

    if (!message.trail)
      return data.user.sendMessage('Timer name is required.');

    const action = message.lead;
    const id = message.trail;

    if (actions.hasOwnProperty(action)) {
      const isall = (id === '*');

      if (isall && action === 'start')
        return void data.user.sendMessage('Reserved character [ * ] can be used as timer ID.');

      const timermap = this.space.get('time.timers');

      if (!isall && action !== 'start' && !timermap.has(id))
        return void data.user.sendMessage(`Timer [ ${id} ] does not exist.`);

      data.user.sendMessage(actions[action](timermap.get(id), timermap, id));
    } else data.user.sendMessage(`Invalid action [ ${action} ].`);
  },
  info: () => `<pre>
USAGE:
      timers ACTION ID
      timers

Timer manipulation, based on certain actions.
Timers are always referenced by their unique ID.

Passing an empty message will
  invoke the [ timerlist ] command.
  See [ info timerlist ].

The timer ID [ * ] is reserved,
  and can be used to act on ALL timers
  with any action except [ start ].

ACTIONS:
  start - Initializes a new timer.
  mark - Marks a point on the timer.
  stop - Ends the timer.
  show - Displays a report for the timer.
  clear - Destroys the timer.
  </pre>`
};

const timerlist = {
  handle: 'timerlist',
  exec: function timerlist (data) {
    const timermap = this.space.get('time.timers');
    const ids = [...timermap.values()];

    let msg = '---';

    if (ids.length) {
      msg = '\n\n' + ids.sort((a, b) => a.id.localeCompare(b.id)).map(t => {
        return `${t.id} [ ${t.done ? 'Ended' : 'Active'} ]`;
      }).join('\n');
    }

    data.user.sendMessage(`<pre>Timers: ${msg}\n`);
  },
  info: () => `<pre>
USAGE: timerlist

Displays a list of timers, and their active status.
  </pre>`
};

module.exports = {
  handle: 'time',
  init: stumble => {
    stumble.space.set('time.start', new Timer('Built-in Uptime'));
    stumble.space.set('time.timers', new Map());
  },
  term: stumble => {
    stumble.space.delete('time.start');
    stumble.space.delete('time.timers');
  },
  commands: [time, uptime, timers, timerlist]
};
