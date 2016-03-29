'use strict';

const feedback = {
  handle: 'io::feedback',
  init: stumble => stumble.space.set('io.feedback', false),
  term: stumble => stumble.space.delete('io.feedback'),
  exec: function feedback () {
    const feeding = this.space.get('io.feedback');

    if (feeding) {
      this.io.output.unpipe(this.io.input);
      this.io.nullify('io');
      this.space.set('io.feedback', false);
    } else if (!this.io.input && !this.io.output) {
      this.space.set('io.feedback', true);
      this.io.input = this.client.connection.inputStream();
      this.io.output = this.client.connection.outputStream();
      this.io.output.pipe(this.io.input);
    }
  },
  commands: [{
    handle: 'feedback',
    exec: function feedback () {
      this.execute('io::feedback');
    }
  }]
};

const get = {
  handle: 'get',
  exec: function get (data) {
    if (!data.message) return;

    const db = this.execute('database::use');
    const target = data.message;

    db.get('SELECT * FROM storedmessages WHERE key=?', [target], (err, row) => {
      if (err || !row) {
        data.user.sendMessage(`Could not find [ ${target} ].`);
        return;
      }

      data.user.channel.sendMessage(row.txt);
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

        if (!msg) {
          usr.sendMessage('Refusing to set an empty field.');
          return;
        }

        if (msg.startsWith(this.config.operator)) {
          usr.sendMessage('Unsafe operation sequence. Aborting [ set ].');
          return;
        }

        const db = this.execute('database::use');

        db.run('INSERT OR REPLACE INTO storedmessages values(?, ?)',
          [key, msg], err => {
            usr.sendMessage(err ? 'A database error occured.' : 'Success!');
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

    db.run('DELETE FROM storedmessages WHERE key=?', [key], err => {
      data.user.sendMessage(err ? 'A database error occured.' : 'Success!');
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

    db.run('CREATE TABLE IF NOT EXISTS storedmessages(key TEXT UNIQUE, txt TEXT)');
  },
  term: stumble => stumble.removeListener('message', shorthand),
  extensions: [feedback],
  commands: [echo, get, set, unset]
};
