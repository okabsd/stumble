'use strict';

const channelid = {
  handle: 'channel-id',
  exec: function channelid (data) {
    const id = data.user.channel.id;
    data.user.sendMessage(`You are in room [ ${id} ].`);
  }
};

const setcomment = {
  handle: 'util::setcomment',
  exec: function setcomment (data) {
    const comment = typeof data.comment === 'string' ? data.comment : '';

    this.client.connection.sendMessage('UserState', { comment });
  },
  commands: [{
    handle: 'comment',
    exec: function comment (data) {
      this.execute('util::setcomment', { comment: data.message });
    }
  }]
};

const commands = {
  handle: 'commands',
  exec: function commands (data) {
    const cmds = [...this.commands.keys()].sort().map(cmd => {
      return `<tr><td width="100%">${cmd}</td></tr>`;
    });

    while (cmds.length)
      data.user.sendMessage(`
        <table border="1" cellpadding="5">
          <tr><th>Command</th></tr>
          ${cmds.splice(0, 20).join('')}
        </table>
      `);
  }
};

module.exports = {
  handle: 'util',
  extensions: [setcomment],
  commands: [channelid, commands]
};
