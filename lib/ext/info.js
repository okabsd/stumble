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
    const name = data.message || 'info';
    const aliased = data.message && this.aliases.get(name);
    const target = this.commands.get(aliased || name);

    let reply;

    if (target) {
      if (aliased)
        data.user.sendMessage(`Note: [ ${name} ] is an alias for [ ${aliased} ].`);

      reply = (
        target.info
        ? target.info.call(this, this, data)
        : 'No info available.'
      );
    }

    data.user.sendMessage(reply || `Command [ ${name} ] not found.`);
  },
  info: stumble => `<pre>
USAGE: info COMMAND

Provides information about a given COMMAND.
</pre>
<br>
For more information about commands found in the Standard Extension Library,
read ${stumble.execute('info::weblink', { text: 'online' })}.
`
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

    const link = this.execute('info::weblink', {
      text: 'find information online'
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
        <i>Use <b>info [ COMMAND_NAME ]</b> to gain additional information, or ${link}.</i>
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
