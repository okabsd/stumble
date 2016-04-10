'use strict';

const get = {
  handle: 'get',
  exec: function get (data) {
    if (!data.message) return;

    const db = this.execute('database::use');
    const target = data.message;

    db.get('SELECT * FROM messagestore WHERE key=?', [target], (err, row) => {
      if (err || !row)
        return data.user.sendMessage(`Could not find [ ${target} ].`);

      data.user.channel.sendMessage(row.message);
    });
  }
};

const set = {
  handle: 'set',
  exec: function set (data) {
    if (!data.message) return;

    const key = this.execute('parser::htmltotext', {
      html: data.message
    });

    let timer;

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

        const error = () => usr.sendMessage('A database error occurred.');

        db.run('INSERT OR REPLACE INTO messageinfo values(?, ?, ?, ?)',
          [key, images, usr.name, Date.now()], ierr => {
            if (ierr) error(ierr);
            else
              db.run('INSERT OR REPLACE INTO messagestore values(?, ?)',
                [key, msg], serr => {
                  if (serr) {
                    error(serr);
                    this.invoke('unset', data);
                  } else usr.sendMessage('Success!');
                });
          });
      }
    };

    this.on('message', followup);
    timer = setTimeout(() => this.removeListener('message', followup), 10000);

    data.user.sendMessage(`The contents of your next message will be associated
                    with the key [ ${key} ]. You have ten seconds.`);
  }
};

const unset = {
  handle: 'unset',
  exec: function unset (data) {
    if (!data.message) return;

    const key = this.execute('parser::htmltotext', {
      html: data.message
    });

    const db = this.execute('database::use');

    db.run('DELETE FROM messageinfo WHERE key=?', [key], ierr => {
      db.run('DELETE FROM messagestore WHERE key=?', [key], serr => {
        if (!ierr && !serr) data.user.sendMessage(`Unset [ ${key} ].`);
      });
    });
  }
};

const search = {
  handle: 'search',
  exec: function search (data) {
    const db = this.execute('database::use');

    const args = [`%${data.message}%`];

    db.all('SELECT * FROM messageinfo WHERE key LIKE ?', args,
      (err, rows) => {
        if (err || !rows.length)
          return data.user.sendMessage(err ?
            'A database error occurred.' : 'Nothing found.');

        rows = rows.sort((a, b) => a.key.localeCompare(b.key)).map(row => {
          return (`
            <tr>
              <td width="20%" align="center">${row.key}</td>
              <td width="20%" align="center">${row.images}</td>
              <td width="20%" align="center">${row.uploader}</td>
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
                <th>Images</th>
                <th>Uploader</th>
                <th>Date</th>
              </tr>
              ${rows.splice(0, 15).join('')}
            </table>
          `);
      });
  }
};

const echo = {
  handle: 'echo',
  exec: data => data.user.sendMessage(data.message)
};

function shorthand (message, user) {
  const conf = this.config.extensions.io;

  if (conf.operator && message.startsWith(conf.operator)) {
    message = message.substring(conf.operator.length);
    if (message) this.invoke('get', { user, message });
  }
}

module.exports = {
  handle: 'io',
  needs: ['parser', 'database'],
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
