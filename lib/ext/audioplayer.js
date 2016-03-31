'use strict';

const play = {
  handle: 'play',
  exec: function play (data) {
    const db = this.execute('database::use');
    const streaming = this.space.get('audio.streaming');
    const target = data.message;

    if (target) {
      db.get('SELECT * FROM audiofiles WHERE key=?', [target], (err, row) => {
        if (err || !row) {
          data.user.sendMessage(`Could not find [ ${target} ].`);
          return;
        }

        const conf = this.config.extensions.audioplayer;
        const queue = this.space.get('audioplayer.queue');
        const max = conf.maxqueue || 1;

        const prelen = queue.length;

        if (prelen < max) {
          queue.push(row);

          if (streaming || prelen)
            data.user.sendMessage(`[ ${row.key} ] added to the queue. \
                                ${queue.length}/${max} items in queue.`);

          if (!streaming) this.invoke('next', data);
        } else data.user.sendMessage('Queue is full.');
      });
    } else if (!streaming) {
      data.delay = 1;
      this.invoke('next', data);
    } else data.user.sendMessage('No key provided');
  }
};

const next = {
  handle: 'next',
  exec: function next (data) {
    const conf = this.config.extensions.audioplayer;
    const delay = (data.delay || conf.delay || 250);

    if (this.space.get('audio.streaming'))
      this.invoke('stop');

    const queue = this.space.get('audioplayer.queue');
    const first = queue[0];

    if (first && !this.io.input) {
      const aconf = this.config.extensions.audio;

      this.space.set('audio.streaming', true);

      setTimeout(() => {
        queue.shift();

        this.execute('audio::playfile', {
          filename: `${aconf.directory}/${first.dir}/${first.file}`,
          done: (error, lived) => {
            if (lived && conf.autoplay) this.invoke('next', { delay });
          }
        });
      }, delay);
    } else if (data && data.user) data.user.sendMessage('Nothing to play.');
  }
};

const stop = {
  handle: 'stop',
  exec: function stop () {
    if (this.space.get('audio.streaming'))
      this.execute('audio::stopfile', { force: true });
  }
};

const find = {
  handle: 'find',
  exec: function find (data) {
    const db = this.execute('database::use');

    const args = [`%${data.message}%`];

    db.all('SELECT * FROM audiofiles WHERE key LIKE ?', args, (err, rows) => {
      if (err) return;

      if (!rows.length) {
        data.user.sendMessage('Nothing found.');
        return;
      }

      rows = rows.sort((a, b) => a.key.localeCompare(b.key)).map(row => {
        return (`
          <tr>
            <td width="35%" align="center">${row.key}</td>
            <td width="25%" align="center">${row.dir}</td>
            <td width="40%" align="center">
              ${new Date(row.mstimestamp).toUTCString()}
            </td>
          </tr>
        `);
      });

      while (rows.length)
        data.user.sendMessage(`
          <table cellpadding="4">
            <tr><th>Key</th><th>Uploader</th><th>Date</th></tr>
            ${rows.splice(0, 15).join('')}
          </table>
        `);
    });
  }
};

const clear = {
  handle: 'clear',
  exec: function clear (data) {
    const queue = this.space.get('audioplayer.queue');

    while (queue.length) queue.pop();

    data.user.sendMessage('Queue is now cleared.');
  }
};

function shorthand (message, user) {
  const conf = this.config.extensions.audioplayer;

  if (conf.operator && message.startsWith(conf.operator)) {
    message = message.substring(conf.operator.length);
    if (message) this.invoke('play', { user, message });
  }
}

module.exports = {
  handle: 'audioplayer',
  needs: ['audio', 'database'],
  init: stumble => {
    stumble.space.set('audioplayer.queue', []);
    stumble.on('message', shorthand);

    const db = stumble.execute('database::use');

    db.run('CREATE TABLE IF NOT EXISTS audiofiles(key TEXT UNQIUE, dir TEXT, file TEXT, mstimestamp INTEGER)');
  },
  term: stumble => {
    stumble.space.delete('audioplayer.queue');
    stumble.removeListener('message', shorthand);
  },
  commands: [play, next, stop, find, clear]
};
