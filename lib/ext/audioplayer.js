'use strict';

const format = require('../gutil').format;

const play = {
  handle: 'play',
  exec: function play (data) {
    const target = data.message;
    const streaming = this.space.get('audio.streaming');

    if (!target) {
      if (streaming)
        data.user.sendMessage('No key provided.');
      else {
        data.delay = 1;
        this.invoke('next', data);
      }

      return;
    }

    const db = this.execute('database::use');

    db.get('SELECT * FROM audiofiles WHERE key=?', [target], (err, row) => {
      if (err) {
        this.emit('error', err);
        return data.user.sendMessage('A database error occurred.');
      } else if (!row)
        return data.user.sendMessage(`Could not find [ ${target} ].`);

      const conf = this.config.extensions.audioplayer;
      const queue = this.space.get('audioplayer.queue');
      const prelen = queue.length;
      const max = conf.maxqueue || 1;

      if (prelen < max) {
        queue.push(row);

        if (streaming || prelen)
          data.user.sendMessage(`[ ${row.key} ] added to the queue. \
                              ${queue.length}/${max} items in queue.`);

        if (!streaming) this.invoke('next', data);
      } else data.user.sendMessage('Queue is full.');
    });
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
      if (err) {
        this.emit('error', err);
        return data.user.sendMessage('A database error occurred.');
      } else if (!rows.length)
        return data.user.sendMessage('Nothing found.');

      const tableTemplate = (`
        <table cellpadding="4">
          <tr>
            <th>Key</th>
            <th>Uploader</th>
            <th>Date</th>
          </tr>
          %s
        </table>
      `);

      const rowTemplate = (`
        <tr>
          <td width="30%" align="center">%s</td>
          <td width="30%" align="center">%s</td>
          <td width="40%" align="center">%s</td>
        </tr>
      `);

      const cushion = tableTemplate.length;
      const bufferSize = this.execute('messenger::textlength', { cushion });
      const parts = rows.sort((a, b) => a.key.localeCompare(b.key));

      this.execute('messenger::buffered', {
        bufferSize,
        parts,
        createPartString: part => format(
          rowTemplate,
          part.key, part.dir,
          new Date(part.mstimestamp).toUTCString()
        ),
        error: e => {
          this.emit('error', new Error(
`${e.message} \
BufferSize ( ${bufferSize + cushion} ) \
Entry ( table:[ audiofiles ] key:[ ${e.part.key} ] )`
          ));

          data.user.sendMessage('A message transmission error occurred.');
        },
        send: message => data.user.sendMessage(format(tableTemplate, message))
      });
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

      const tableTemplate = (`
        <table cellpadding="4">
          <tr>
            <th>Position</th>
            <th>Key</th>
          </tr>
          %s
        </table>
        <center>
          <i>Queue limit: ${maxqueue}</i>
        </center>
      `);

      const rowTemplate = (`
        <tr>
          <td width="40%" align="center">%s</td>
          <td width="60%" align="center">%s</td>
        </tr>
      `);

      const cushion = tableTemplate.length;
      const bufferSize = this.execute('messenger::textlength', { cushion });
      const parts = queue.slice();

      this.execute('messenger::buffered', {
        bufferSize,
        parts,
        createPartString: (part, partN) => format(
          rowTemplate,
          partN + 1,
          part.key
        ),
        error: e => {
          this.emit('error', new Error(
`${e.message} \
BufferSize ( ${bufferSize + cushion} ) \
Queue ( key:[ ${e.part.key} ] )`
          ));

          data.user.sendMessage('A message transmission error occurred.');
        },
        send: message => data.user.sendMessage(format(tableTemplate, message))
      });
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
  needs: ['audio', 'database', 'messenger'],
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
