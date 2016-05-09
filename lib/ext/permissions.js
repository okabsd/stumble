'use strict';

const gutil = require('../gutil');
const format = gutil.format;
const minmax = gutil.minmax;
const defaults = gutil.defaults;

const unalias = {
  handle: 'permissions::unalias',
  exec: function unalias (data) {
    if (data.handle && this.aliases.has(data.handle)) {
      const alias = data.handle;
      const handle = data.handle = this.aliases.get(alias);

      if (data.notifyOfAlias)
        data.notifyOfAlias.sendMessage(`Note: [ ${alias} ] is an alias for [ ${handle} ]`);
    }
  }
};

const groups = {
  handle: 'permissions::groups',
  exec: function groups (data) {
    const db = this.execute('database::use');

    db.all('SELECT * FROM permgroups', (err, rows) => {
      if (err) this.emit('error', err);
      if (data.done) data.done(err, rows);
    });
  },
  commands: [{
    handle: 'groups',
    exec: function groupscmd (data) {
      const done = (error, rows) => {
        if (error || !rows.length)
          return data.user.sendMessage(
            error
            ? 'A database error occurred.'
            : 'No groups.'
          );

        const tableTemplate = (`
          <table cellpadding="4">
            <tr>
              <th>Group Name</th>
              <th>Group Level</th>
            </tr>
            %s
          </table>
        `);

        const rowTemplate = (`
          <tr>
            <td width="60%" align="center">%s</td>
            <td width="40%" align="center">%s</td>
          </tr>
        `);

        const cushion = tableTemplate.length;
        const bufferSize = this.execute('messenger::textlength', { cushion });
        const parts = rows.sort((a, b) => a.name.localeCompare(b.name));

        this.execute('messenger::buffered', {
          bufferSize,
          parts,
          createPartString: part => format(
            rowTemplate,
            part.name, part.level
          ),
          error: e => {
            this.emit('error', new Error(
`${e.message} \
BufferSize ( ${bufferSize + cushion} ) \
Entry ( table:[ permgroups ] name:[ ${e.part.name} ] )`
            ));

            data.user.sendMessage('A message transmission error occurred.');
          },
          send: message => data.user.sendMessage(format(tableTemplate, message))
        });
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
      if (err) this.emit('error', err);
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

      if (Number.isNaN(level))
        return void data.user.sendMessage('Needs level.');

      const name = pieces.join(' ');

      if (!name)
        return void data.user.sendMessage('Needs name.');

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
      if (error) this.emit('error', error);
      if (data.done) data.done(error, message);
    };

    db.run('DELETE FROM permusers WHERE permgroup = ?', args, err => {
      reply(err, !err && `Deleted all users with group [ ${data.name} ].`);
    });

    db.run('DELETE FROM permcommands WHERE permgroup = ?', args, err => {
      reply(err, !err && `Deleted all commands with group [ ${data.name} ].`);
    });

    db.run('DELETE FROM permgroups WHERE name = ?', args, err => {
      reply(err, !err && `Deleted group [ ${data.name} ].`);
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

      const done = (err, msg) => data.user.sendMessage(
        err
        ? 'A database error occurred.'
        : msg
      );

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
      if (err) this.emit('error', err);
      if (data.done) data.done(err, rows);
    });
  },
  commands: [{
    handle: 'users',
    exec: function userscmd (data) {
      const done = (error, rows) => {
        if (error || !rows.length)
          return data.user.sendMessage(
            error
            ? 'A database error occurred.'
            : 'No users.'
          );

        const tableTemplate = (`
          <table cellpadding="4">
            <tr>
              <th>User Name</th>
              <th>Group Name</th>
            </tr>
            %s
          </table>
        `);

        const rowTemplate = (`
          <tr>
            <td width="60%" align="center">%s</td>
            <td width="40%" align="center">%s</td>
          </tr>
        `);

        const cushion = tableTemplate.length;
        const bufferSize = this.execute('messenger::textlength', { cushion });
        const parts = rows.sort((a, b) => a.name.localeCompare(b.name));

        this.execute('messenger::buffered', {
          bufferSize,
          parts,
          createPartString: part => format(
            rowTemplate,
            part.name, part.permgroup
          ),
          error: e => {
            this.emit('error', new Error(
`${e.message} \
BufferSize ( ${bufferSize + cushion} ) \
Entry ( table:[ permusers ] name:[ ${e.part.name} ] )`
            ));

            data.user.sendMessage('A message transmission error occurred.');
          },
          send: message => data.user.sendMessage(format(tableTemplate, message))
        });
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

    const iferror = error => error && this.emit('error', error);

    db.get('SELECT 1 FROM permgroups WHERE name = ?', args, (gerr, res) => {
      iferror(gerr);

      if (gerr || !res)
        return (
          data.done &&
          data.done(gerr, !gerr && `The group [ ${data.group} ] does not exist.`)
        );

      args.unshift(data.name);
      args.unshift(data.hash);

      db.run('INSERT OR REPLACE INTO permusers values(?, ?, ?)', args, err => {
        iferror(err);

        if (data.done)
          data.done(err, !err && `User [ ${data.name} ] set. Using group [ ${data.group} ].`);
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

      if (!user)
        return void data.user.sendMessage('User not found.');

      if (!user.hash)
        return void data.user.sendMessage('User has no certificate.');

      let timer = null;

      const followup = (msg, usr) => {
        if (usr !== data.user) return;

        this.removeListener('message', followup);
        clearTimeout(timer);

        if (msg.startsWith(this.config.operator))
          return usr.sendMessage('Unsafe operation sequence. Aborting [ usermod ].');

        const group = this.execute('parser::htmltotext', { html: msg });

        this.execute('permissions::usermod', {
          hash: user.hash,
          name,
          group,
          done: (error, status) => data.user.sendMessage(
            error
            ? 'A database error occurred.'
            : status
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
      if (err) this.emit('error', err);
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

      if (!name)
        return void data.user.sendMessage('Name needed.');

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

const commands = {
  handle: 'permissions::commands',
  exec: function commands (data) {
    const db = this.execute('database::use');

    db.all('SELECT * FROM permcommands', (err, rows) => {
      if (err) this.emit('error', err);
      if (data.done) data.done(err, rows);
    });
  },
  commands: [{
    handle: 'commands',
    exec: function commandscmd (data) {
      const done = (error, rows) => {
        if (error || !rows.length)
          return data.user.sendMessage(
            error
            ? 'A database error occurred.'
            : 'No commands.'
          );

        const tableTemplate = (`
          <table cellpadding="4">
            <tr>
              <th>Command</th>
              <th>Group Name</th>
            </tr>
            %s
          </table>
        `);

        const rowTemplate = (`
          <tr>
            <td width="60%" align="center">%s</td>
            <td width="40%" align="center">%s</td>
          </tr>
        `);

        const cushion = tableTemplate.length;
        const bufferSize = this.execute('messenger::textlength', { cushion });
        const parts = (
          rows
            .filter(row => this.commands.has(row.name))
            .sort((a, b) => a.name.localeCompare(b.name))
        );

        this.execute('messenger::buffered', {
          bufferSize,
          parts,
          createPartString: part => format(
            rowTemplate,
            part.name, part.permgroup
          ),
          error: e => {
            this.emit('error', new Error(
`${e.message} \
BufferSize ( ${bufferSize + cushion} ) \
Entry ( table:[ permcommands ] name:[ ${e.part.name} ] )`
            ));

            data.user.sendMessage('A message transmission error occurred.');
          },
          send: message => data.user.sendMessage(format(tableTemplate, message))
        });
      };

      this.execute('permissions::commands', { done });
    },
    info: () => `<pre>
USAGE: commands

Lists all commands, and their group.
    </pre>`
  }]
};

const commandmod = {
  handle: 'permissions::commandmod',
  hooks: ['permissions::unalias'],
  exec: function commandmod (data) {
    const db = this.execute('database::use');

    const args = [data.group];

    const iferror = error => error && this.emit('error', error);

    db.get('SELECT 1 FROM permgroups WHERE name = ?', args, (gerr, res) => {
      iferror(gerr);

      if (gerr || !res)
        return (
          data.done &&
          data.done(gerr, !gerr && `The group [ ${data.group} ] does not exist.`)
        );

      args.unshift(data.handle);

      db.run('INSERT OR REPLACE INTO permcommands values(?, ?)', args, err => {
        iferror(err);

        if (data.done)
          data.done(err, !err && `Command [ ${data.handle} ] set. Using group [ ${data.group} ].`);
      });
    });
  },
  commands: [{
    handle: 'commandmod',
    exec: function commandmodcmd (data) {
      if (!data.message) return;

      const parsed = this.execute('parser::htmltotext', {
        html: data.message
      });

      if (!parsed) return;

      const pieces = parsed.split(' ');
      const handle = pieces.shift();

      if (!(this.commands.has(handle) || this.aliases.has(handle)))
        return void data.user.sendMessage(`Command [ ${handle} ] not found.`);

      const group = pieces.join(' ');

      if (!group)
        return void data.user.sendMessage('Needs group.');

      const done = (error, status) => data.user.sendMessage(
        error
        ? 'A database error occurred.'
        : status
      );

      this.execute('permissions::commandmod', {
        notifyOfAlias: data.user,
        handle, group, done
      });
    },
    info: () => `<pre>
USAGE: commandmod COMMAND_HANDLE GROUP_NAME

Modifies the group COMMAND_HANDLE belongs to,
using GROUP_NAME.
    </pre>`
  }]
};

const commanddel = {
  handle: 'permissions::commanddel',
  hooks: ['permissions::unalias'],
  exec: function commanddel (data) {
    const db = this.execute('database::use');

    const args = [data.handle];

    db.run('DELETE FROM permcommands WHERE name = ?', args, err => {
      if (err) this.emit('error', err);
      if (data.done) data.done(err, !err && data.handle);
    });
  },
  commands: [{
    handle: 'commanddel',
    exec: function commanddelcmd (data) {
      if (!data.message) return;

      const handle = this.execute('parser::htmltotext', {
        html: data.message
      });

      if (!handle)
        return void data.user.sendMessage('Name needed.');

      this.execute('permissions::commanddel', {
        notifyOfAlias: data.user,
        handle,
        done: (error, removed) => data.user.sendMessage(
          error
          ? 'A database error occurred.'
          : `Removed command [ ${removed} ].`
        )
      });
    },
    info: () => `<pre>
USAGE: commanddel COMMAND_HANDLE

Removes a command identified by COMMAND_HANDLE.
    </pre>`
  }]
};

const invokingerror = (stumble, error) => {
  console.warn('Permissions extension snagged on a database error during invocation.');
  stumble.emit('error', error);
};

const invoke = {
  handle: 'permissions::invoke',
  hooks: ['permissions::unalias'],
  exec: function invoke (data) {
    const conf = this.config.extensions.permissions;

    if (conf.hasOwnProperty('superuser') && conf.superuser === data.user.name) {
      if (this.space.get('permissions.warnsuperuser')) {
        const wtime = defaults(conf.warningtime, 60000);

        data.user.sendMessage(`<pre>
Warning:

You are acting as the super user.
You can currently invoke any command.
Try not to break everything.

This warning will be suppressed for ${(wtime / 1000) >> 0} seconds.
        </pre>`);

        this.space.set('permissions.warnsuperuser', false);
        setTimeout(() => this.space.set('permissions.warnsuperuser', true), wtime);
      }

      return void this.invoke(data.handle, data);
    }

    if (!data.user.hash)
      return void data.user.sendMessage(`
        Permission denied.
        Permissions system is in place.
        You are not certified, and therefore can not use commands.
        Seek your local administrator for help.
      `);

    const db = this.execute('database::use');

    const args = [data.handle];

    db.get('SELECT * FROM permcommands WHERE name = ?', args, (cerr, crow) => {
      if (cerr) return invokingerror(this, cerr);
      if (!crow) return this.invoke(data.handle, data);

      db.get('SELECT * FROM permusers WHERE name = ? AND hash = ?',
        [data.user.name, data.user.hash], (uerr, urow) => {
          if (uerr) return invokingerror(this, uerr);

          if (!urow)
            return data.user.sendMessage(`
              Permission denied.
              Could not find you in the permissions system.
            `);

          db.get(`
            SELECT 1 FROM permgroups
            WHERE name = (?) AND level >= (
              SELECT level FROM permgroups
              WHERE name = (?)
            )
            `, [urow.permgroup, crow.permgroup], (ferr, res) => {
              if (ferr) return invokingerror(this, ferr);

              if (res)
                this.invoke(data.handle, data);
              else
                data.user.sendMessage(`
                  Permission denied.
                  You do not have the adequate group level to use [ ${data.handle} ].
                `);
            });
        });
    });
  }
};

module.exports = {
  handle: 'permissions',
  needs: ['database', 'messenger', 'parser'],
  init: stumble => {
    stumble.space.set('_STANDARD_PERMISSIONS_', true);
    stumble.space.set('permissions.warnsuperuser', true);

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
  term: stumble => {
    stumble.space.delete('_STANDARD_PERMISSIONS_');
    stumble.space.delete('permissions.warnsuperuser');
  },
  extensions: [
    unalias, invoke,
    groups, groupmod, groupdel,
    users, usermod, userdel,
    commands, commandmod, commanddel
  ]
};
