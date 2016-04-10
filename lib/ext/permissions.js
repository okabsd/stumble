'use strict';

const minmax = require('../gutil').minmax;

const groups = {
  handle: 'permissions::groups',
  exec: function groups (data) {
    const db = this.execute('database::use');

    db.all('SELECT * FROM permgroups', (err, rows) => {
      if (data.done) data.done(err, rows);
    });
  },
  commands: [{
    handle: 'groups',
    exec: function groupscmd (data) {
      const done = (error, rows) => {
        if (error || !rows.length) {
          data.user.sendMessage(
            error
            ? 'A database error occurred.'
            : 'No groups.'
          );
          return;
        }

        rows = rows.sort((a, b) => a.name.localeCompare(b.name)).map(row => {
          return (`
            <tr>
              <td width="60%" align="center">${row.name}</td>
              <td width="40%" align="center">${row.level}</td>
            </tr>
          `);
        });

        while (rows.length)
          data.user.sendMessage(`
            <table cellpadding="4">
              <tr>
                <th>Group Name</th>
                <th>Group Level</th>
              </tr>
              ${rows.splice(0, 15).join('')}
            </table>
          `);
      };

      this.execute('permissions::groups', { done });
    },
    info: () => `<pre>
USAGE: groups

Lists all groups, and their levels.
    </pre>`
  }]
};

const groupmod = {
  handle: 'permissions::groupmod',
  exec: function groupmod (data) {
    const db = this.execute('database::use');
    const args = [data.name, data.level];

    db.run('INSERT OR REPLACE INTO permgroups values(?, ?)', args, err => {
      if (data.done) data.done(err);
    });
  },
  commands: [{
    handle: 'groupmod',
    exec: function groupmod (data) {
      if (!data.message) return;

      const parsed = this.execute('parser::htmltotext', {
        html: data.message
      });

      if (!parsed) return;

      const pieces = parsed.split(' ');
      let level = parseInt(pieces.pop(), 10);

      if (Number.isNaN(level)) {
        data.user.sendMessage('Needs level.');
        return;
      }

      const name = pieces.join(' ');

      if (!name) {
        data.user.sendMessage('Needs name.');
        return;
      }

      const conf = this.config.extensions.permissions;

      level = minmax(0, level, conf.maxlevel || 100);

      this.execute('permissions::groupmod', {
        name,
        level,
        done: error => data.user.sendMessage(
          error
          ? 'A database error occurred.'
          : `Group [ ${name} ] set. Using level [ ${level} ].`
        )
      });
    },
    info: () => `<pre>
USAGE: groupmod GROUP_NAME GROUP_LEVEL

Modifies the permissions level of GROUP_NAME
to the new value of GROUP_LEVEL.
If GROUP_NAME does not exist, it will be created.
    </pre>`
  }]
};

const groupdel = {
  handle: 'permissions::groupdel',
  exec: function groupdel (data) {
    const db = this.execute('database::use');
    const args = [data.name];

    const reply = (error, message) => {
      if (data.done) data.done(error, error ? null : message);
    };

    db.run('DELETE FROM permusers WHERE permgroup = ?', args, err => {
      reply(err, `Deleted all users with group [ ${data.name} ].`);
    });

    db.run('DELETE FROM permcommands WHERE permgroup = ?', args, err => {
      reply(err, `Deleted all commands with group [ ${data.name} ].`);
    });

    db.run('DELETE FROM permgroups WHERE name = ?', args, err => {
      reply(err, `Deleted group [ ${data.name} ].`);
    });
  },
  commands: [{
    handle: 'groupdel',
    exec: function groupdelcmd (data) {
      if (!data.message) return;

      const name = this.execute('parser::htmltotext', {
        html: data.message
      });

      if (!name) return;

      const done = (err, msg) => data.user.sendMessage(err ? err.message : msg);

      this.execute('permissions::groupdel', { name, done });
    },
    info: () => `<pre>
USAGE: groupdel GROUP_NAME

Deletes all users and commands belonging to
GROUP_NAME before deleting GROUP_NAME.
    </pre>`
  }]
};

const users = {
  handle: 'permissions::users',
  exec: function users (data) {
    const db = this.execute('database::use');

    db.all('SELECT * FROM permusers', (err, rows) => {
      if (data.done) data.done(err, rows);
    });
  },
  commands: [{
    handle: 'users',
    exec: function userscmd (data) {
      const done = (error, rows) => {
        if (error || !rows.length) {
          data.user.sendMessage(
            error
            ? 'A database error occurred.'
            : 'No users.'
          );
          return;
        }

        rows = rows.sort((a, b) => a.name.localeCompare(b.name)).map(row => {
          return (`
            <tr>
              <td width="60%" align="center">${row.name}</td>
              <td width="40%" align="center">${row.permgroup}</td>
            </tr>
          `);
        });

        while (rows.length)
          data.user.sendMessage(`
            <table cellpadding="4">
              <tr>
                <th>User Name</th>
                <th>Group Name</th>
              </tr>
              ${rows.splice(0, 15).join('')}
            </table>
          `);
      };

      this.execute('permissions::users', { done });
    },
    info: () => `<pre>
USAGE: users

Lists all users, and their group.
    </pre>`
  }]
};

const usermod = {
  handle: 'permissions::usermod',
  exec: function usermod (data) {
    const db = this.execute('database::use');

    const args = [data.group];

    db.get('SELECT 1 FROM permgroups WHERE name = ?', args, (gerr, res) => {
      if (gerr || !res) {
        if (data.done) data.done(gerr || { message: 'Group does not exist.' });
        return;
      }

      args.unshift(data.name);
      args.unshift(data.hash);

      db.run('INSERT OR REPLACE INTO permusers values(?, ?, ?)', args, err => {
        if (data.done) data.done(err);
      });
    });
  },
  commands: [{
    handle: 'usermod',
    exec: function usermod (data) {
      if (!data.message) return;

      const name = this.execute('parser::htmltotext', {
        html: data.message
      });

      const user = this.client.userByName(name);

      if (!user) {
        data.user.sendMessage('User not found.');
        return;
      }

      if (!user.hash) {
        data.user.sendMessage('User not registered.');
        return;
      }

      let timer;

      const followup = (msg, usr) => {
        if (usr !== data.user) return;

        this.removeListener('message', followup);
        clearTimeout(timer);

        if (msg.startsWith(this.config.operator)) {
          usr.sendMessage('Unsafe operation sequence. Aborting [ usermod ].');
          return;
        }

        const group = this.execute('parser::htmltotext', { html: msg });

        this.execute('permissions::usermod', {
          hash: user.hash,
          name,
          group,
          done: error => data.user.sendMessage(
            error
            ? error.message
            : `User [ ${name} ] set. Using group [ ${group} ].`
          )
        });
      };

      this.on('message', followup);

      timer = setTimeout(() => this.removeListener('message', followup), 5000);

      data.user.sendMessage(`The contents of your next message
        will set the group for [ ${user.name} ]. You have five seconds.`);
    },
    info: () => `<pre>
USAGE: usermod USER_NAME

Modifies the group USER_NAME belongs to.
New value is taken from the next message.
    </pre>`
  }]
};

const userdel = {
  handle: 'permissions::userdel',
  exec: function userdel (data) {
    const db = this.execute('database::use');

    const args = [data.name];

    db.run('DELETE FROM permusers WHERE name = ?', args, err => {
      if (data.done) data.done(err);
    });
  },
  commands: [{
    handle: 'userdel',
    exec: function userdelcmd (data) {
      if (!data.message) return;

      const name = this.execute('parser::htmltotext', {
        html: data.message
      });

      if (!name) {
        data.user.sendMessage('Name needed.');
        return;
      }

      this.execute('permissions::userdel', {
        name,
        done: error => data.user.sendMessage(
          error
          ? 'A database error occurred.'
          : `Removed user [ ${name} ].`
        )
      });
    },
    info: () => `<pre>
USAGE: userdel USER_NAME

Removes a user identified by USER_NAME.
    </pre>`
  }]
};

module.exports = {
  handle: 'permissions',
  needs: ['database', 'parser'],
  init: stumble => {
    stumble.space.set('_STANDARD_PERMISSIONS_', true);

    const db = stumble.execute('database::use');

    db.run(`
      CREATE TABLE IF NOT EXISTS permgroups(
        name TEXT UNIQUE,
        level INTEGER
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS permusers(
        hash TEXT UNIQUE,
        name TEXT UNIQUE,
        permgroup TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS permcommands(
        name TEXT UNIQUE,
        permgroup TEXT
      )
    `);
  },
  term: stumble => stumble.space.delete('_STANDARD_PERMISSIONS_'),
  extensions: [
    groups, groupmod, groupdel,
    users, usermod, userdel
  ]
};
