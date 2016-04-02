'use strict';

const weblink = {
  handle: 'info::weblink',
  exec: function weblink (data) {
    const url = 'https://github.com/Okahyphen/stumble/wiki/SEL-Command-Information';
    const text = data && data.text || 'Online Information';
    const hash = (data && data.hash) ? `#${data.hash}` : '';

    return `<a href="${url}${hash}">${text}</a>`;
  }
};

const info = {
  handle: 'info',
  exec: function info (data) {
    if (!data.message) {
      data.user.sendMessage(this.execute('info::weblink'));
      return;
    }

    const target = this.commands.get(data.message);
    let reply;

    if (target)
      reply = target.info ?
        target.info.call(this, this, data) : 'No info available.';
    else reply = `Command [ ${data.message} ] not found.`;

    data.user.sendMessage(reply);
  },
  info: stumble => stumble.execute('info::weblink')
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
  handle: 'info',
  extensions: [weblink],
  commands: [info, commands]
};
