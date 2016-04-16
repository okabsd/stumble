'use strict';

const play = {
  handle: 'play',
  exec: function play (data) {
    const db = this.execute('database::use');
    const streaming = this.space.get('audio.streaming');
    const target = data.message;

    if (target) {
      db.get('SELECT * FROM audiofiles WHERE key=?', [target], (err, row) => {
        if (err || !row)
          return data.user.sendMessage(`Could not find [ ${target} ].`);

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
  },
  info: () => `<pre>
USAGE: play KEY

Plays the audio file associated with the KEY.

If there is audio playing,
the clip will be placed into the queue,
provided there is room.
  </pre>`
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
  },
  info: () => `<pre>
USAGE: next

Stops audio playback, and attempts to play the
next audio file from the queue.
  </pre>`
};

const stop = {
  handle: 'stop',
  exec: function stop () {
    if (this.space.get('audio.streaming'))
      this.execute('audio::stopfile', { force: true });
  },
  info: () => `<pre>
USAGE: stop

Stops audio playback.
  </pre>`
};

const find = {
  handle: 'find',
  exec: function find (data) {
    const db = this.execute('database::use');

    const args = [`%${data.message}%`];

    db.all('SELECT * FROM audiofiles WHERE key LIKE ?', args, (err, rows) => {
      if (err || !rows.length)
        return data.user.sendMessage(err ?
          'A database error occurred.' : 'Nothing found.');

      rows = rows.sort((a, b) => a.key.localeCompare(b.key)).map(row => {
        return (`
          <tr>
            <td width="30%" align="center">${row.key}</td>
            <td width="30%" align="center">${row.dir}</td>
            <td width="40%" align="center">
              ${new Date(row.mstimestamp).toUTCString()}
            </td>
          </tr>
        `);
      });

      while (rows.length)
        data.user.sendMessage(`
          <table cellpadding="4">
            <tr>
              <th>Key</th>
              <th>Uploader</th>
              <th>Date</th>
            </tr>
            ${rows.splice(0, 15).join('')}
          </table>
        `);
    });
  },
  info: () => `<pre>
USAGE: find SUBSTRING

Looks up stored audio with keys containing SUBSTRING.
Providing no SUBSTRING will return all keys.
  </pre>`
};

const list = {
  handle: 'list',
  exec: function list (data) {
    const queue = this.space.get('audioplayer.queue');

    if (!queue.length)
      data.user.sendMessage('Queue is empty.');
    else {
      const maxqueue = this.config.extensions.audioplayer.maxqueue;

      const cqueue = queue.map((item, index) => {
        return (`
          <tr>
            <td width="40%" align="center">${index + 1}</td>
            <td width="60%" align="center">${item.key}</td>
          </tr>
        `);
      });

      while (cqueue.length)
        data.user.sendMessage(`
          <table cellpadding="4">
            <tr>
              <th>Position</th>
              <th>Key</th>
            </tr>
            ${cqueue.splice(0, 15).join('')}
          </table>
          <center>
            <i>Queue limit: ${maxqueue}</i>
          </center>
        `);
    }
  },
  info: () => `<pre>
USAGE: list

Lists entries in the audio player queue.
  </pre>`
};

const clear = {
  handle: 'clear',
  exec: function clear (data) {
    const queue = this.space.get('audioplayer.queue');

    while (queue.length) queue.pop();

    data.user.sendMessage('Queue is now cleared.');
  },
  info: () => `<pre>
USAGE: clear

Clears all entries from the audio player queue.
  </pre>`
};

function shorthand (message, user) {
  const conf = this.config.extensions.audioplayer;

  if (conf.operator && message.startsWith(conf.operator)) {
    message = message.substring(conf.operator.length);

    if (message) {
      const handle = 'play';
      const data = { handle, user, message };

      if (this.space.has('_STANDARD_PERMISSIONS_'))
        this.execute('permissions::invoke', data);
      else
        this.invoke(handle, data);
    }
  }
}

module.exports = {
  handle: 'audioplayer',
  needs: ['audio', 'database'],
  init: stumble => {
    stumble.space.set('audioplayer.queue', []);
    stumble.on('message', shorthand);

    const db = stumble.execute('database::use');

    db.run(`
      CREATE TABLE IF NOT EXISTS audiofiles(
        key TEXT UNQIUE,
        dir TEXT,
        file TEXT,
        mstimestamp INTEGER
      )
    `);
  },
  term: stumble => {
    stumble.space.delete('audioplayer.queue');
    stumble.removeListener('message', shorthand);
  },
  commands: [play, next, stop, find, list, clear]
};
