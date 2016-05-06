'use strict';

const gutil = require('../gutil');
const format = gutil.format;

const get = {
  handle: 'get',
  exec: function get (data) {
    if (!data.message) return;

    const db = this.execute('database::use');
    const target = data.message;

    db.get('SELECT * FROM messagestore WHERE key=?', [target], (err, row) => {
      if (err) {
        this.emit('error', err);
        return data.user.sendMessage('A database error occurred.');
      } else if (!row)
        return data.user.sendMessage(`Could not find [ ${target} ].`);

      data.user.channel.sendMessage(row.message);
    });
  },
  info: () => `<pre>
USAGE: get KEY

Displays the message associated with the given KEY.
  </pre>`
};

const set = {
  handle: 'set',
  exec: function set (data) {
    if (!data.message) return;

    const key = this.execute('parser::htmltotext', {
      html: data.message
    });

    let timer = null;

    const followup = (msg, usr) => {
      if (usr === data.user) {
        this.removeListener('message', followup);
        clearTimeout(timer);

        if (!msg)
          return usr.sendMessage('Refusing to set an empty field.');

        if (msg.startsWith(this.config.operator))
          return usr.sendMessage('Unsafe operation sequence. Aborting [ set ].');

        const db = this.execute('database::use');

        const images = this.execute('parser::getimages', {
          html: msg
        }).length;

        const onerror = e => {
          this.emit('error', e);
          usr.sendMessage('A database error occurred.');
        };

        db.run('INSERT OR REPLACE INTO messageinfo values(?, ?, ?, ?)',
          [key, images, usr.name, Date.now()], ierr => {
            if (ierr) return onerror(ierr);

            db.run('INSERT OR REPLACE INTO messagestore values(?, ?)',
              [key, msg], serr => {
                if (serr) onerror(serr);
                else usr.sendMessage(`Success! Message saved as [ ${key} ].`);
              });
          });
      }
    };

    this.on('message', followup);
    timer = setTimeout(() => this.removeListener('message', followup), 10000);

    data.user.sendMessage(`The contents of your next message will be associated
                    with the key [ ${key} ]. You have ten seconds.`);
  },
  info: () => `<pre>
USAGE: set KEY

Sets the contents associated with the KEY
to the next message sent.
  </pre>`
};

const unset = {
  handle: 'unset',
  exec: function unset (data) {
    if (!data.message) return;

    const key = this.execute('parser::htmltotext', {
      html: data.message
    });

    const db = this.execute('database::use');

    const onerror = e => {
      this.emit('error', e);
      data.user.sendMessage('A database error occurred.');
    };

    db.run('DELETE FROM messageinfo WHERE key=?', [key], ierr => {
      if (ierr) return onerror(ierr);

      db.run('DELETE FROM messagestore WHERE key=?', [key], serr => {
        if (serr) onerror(serr);
        else data.user.sendMessage(`Unset [ ${key} ].`);
      });
    });
  },
  info: () => `<pre>
USAGE: unset KEY

Removes the KEY and associated message from storage.
  </pre>`
};

const search = {
  handle: 'search',
  exec: function search (data) {
    const db = this.execute('database::use');

    const args = [`%${data.message}%`];

    db.all('SELECT * FROM messageinfo WHERE key LIKE ?', args, (err, rows) => {
      if (err) {
        this.emit('error', err);
        return data.user.sendMessage('A database error occurred.');
      } else if (!rows.length)
        return data.user.sendMessage('Nothing found.');

      const tableTemplate = (`
        <table cellpadding="4">
          <tr>
            <th>Key</th>
            <th>Images</th>
            <th>Uploader</th>
            <th>Date</th>
          </tr>
          %s
        </table>
      `);

      const rowTemplate = (`
        <tr>
          <td width="20%" align="center">%s</td>
          <td width="20%" align="center">%s</td>
          <td width="20%" align="center">%s</td>
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
          part.key, part.images, part.uploader,
          new Date(part.mstimestamp).toUTCString()
        ),
        error: e => {
          this.emit('error', new Error(
`${e.message} \
BufferSize ( ${bufferSize + cushion} ) \
Entry ( table:[ messageinfo ] key:[ ${e.part.key} ] )`
          ));

          data.user.sendMessage('A message transmission error occurred.');
        },
        send: message => data.user.sendMessage(format(tableTemplate, message))
      });
    });
  },
  info: () => `<pre>
USAGE: search SUBSTRING

Searches for messages with keys containing SUBSTRING.

Shows all keys if no SUBSTRING given.
  </pre>`
};

const echo = {
  handle: 'echo',
  exec: data => data.user.sendMessage(data.message),
  info: () => `<pre>
USAGE: echo MESSAGE

Echoes the MESSAGE back to the sender.
  </pre>`
};

function shorthand (message, user) {
  const conf = this.config.extensions.io;

  if (conf.operator && message.startsWith(conf.operator)) {
    message = message.substring(conf.operator.length);

    if (message) {
      const handle = 'get';
      const data = { handle, user, message };

      if (this.space.has('_STANDARD_PERMISSIONS_'))
        this.execute('permissions::invoke', data);
      else
        this.invoke(handle, data);
    }
  }
}

module.exports = {
  handle: 'io',
  needs: ['database', 'messenger', 'parser'],
  init: stumble => {
    stumble.on('message', shorthand);

    const db = stumble.execute('database::use');

    db.run(`
      CREATE TABLE IF NOT EXISTS messageinfo(
        key TEXT UNIQUE,
        images INTEGER,
        uploader TEXT,
        mstimestamp INTEGER
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS messagestore(
        key TEXT UNIQUE,
        message TEXT
      )
    `);
  },
  term: stumble => stumble.removeListener('message', shorthand),
  commands: [echo, get, set, unset, search]
};
