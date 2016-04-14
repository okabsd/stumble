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
    if (!data.message)
      return void data.user.sendMessage(this.execute('info::weblink'));

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

const help = {
  handle: 'help',
  exec: function help (data) {
    const cmds = [...this.commands.keys()].sort((a, b) => {
      return a.localeCompare(b);
    }).map(cmd => {
      return (`
        <tr>
          <td width="100%" align="center">${cmd}</td>
        </tr>
      `);
    });

    data.user.sendMessage('List of available commands:');

    while (cmds.length)
      data.user.sendMessage(`
        <i>You have asked for help.</i>
        <table cellpadding="4">
          <tr>
            <th>Command</th>
          </tr>
          ${cmds.splice(0, 20).join('')}
        </table>
        <i>Use <b>info [ COMMAND_NAME ]</b> to gain additional information.</i>
      `);
  },
  info: () => `<pre>
USAGE: help

Displays each command currently loaded.
  </pre>`
};

module.exports = {
  handle: 'info',
  extensions: [weblink],
  commands: [info, help]
};
