'use strict';

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
  info: stumble => {
    return stumble.execute('info::weblink');
  }
};

const weblink = {
  handle: 'info::weblink',
  exec: function weblink (data) {
    const url = 'https://github.com/Okahyphen/stumble/wiki/Command-Information';
    const text = data && data.text || 'Online Information';
    const hash = (data && data.hash) ? `#${data.hash}` : '';

    return `<a href="${url}${hash}">${text}</a>`;
  }
};

module.exports = {
  handle: 'info',
  extensions: [weblink],
  commands: [info]
};
