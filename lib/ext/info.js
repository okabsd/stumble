'use strict';

const info = {
  handle: 'info',
  exec: function info (data) {
    if (!data.message) {
      const self = this.commands.get('info').info.call(this, this, data);
      data.user.sendMessage(self);
      return;
    }

    const target = this.commands.get(data.message);
    let reply;

    if (target)
      if (target.info) reply = target.info.call(this, this, data);
      else reply = 'No info available.';
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
