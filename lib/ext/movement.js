'use strict';

const mvjoin = {
  handle: 'movement::join',
  exec: function mvjoin (data) {
    let channel = this.client.channelByName(data.channel);

    if (!channel && (/^\d+$/).test(data.channel)) {
      const id = parseInt(data.channel, 10);
      channel = this.client.channelById(id);
    }

    if (channel) channel.join();

    return !!channel;
  }
};

const leave = {
  handle: 'leave',
  exec: function leave (data) {
    const up = this.client.user.channel.parent;

    if (up) up.join();
    else data.user.sendMessage('I have no where to go.');
  }
};

const join = {
  handle: 'join',
  exec: function join (data) {
    if (data.message) {
      if (!this.execute('movement::join', { channel: data.message }))
        data.user.sendMessage('Could not find channel.');
      return;
    }

    const src = this.client.user.channel;
    const dest = data.user.channel;

    if (src !== dest) dest.join();
    else data.user.sendMessage('Already here.');
  }
};

function joiner (user, id, channel) {
  const defined = typeof id !== 'undefined';

  if (defined) {
    if (!this.execute('movement::join', { channel }))
      user.sendMessage(`Specified ${id} channel not found.`);
  } else user.sendMessage(`No ${id} channel specified.`);
}

const afk = {
  handle: 'afk',
  exec: function afk (data) {
    joiner.call(this, data.user, 'AFK', this.config.extensions.movement.afk);
  }
};

const home = {
  handle: 'home',
  exec: function home (data) {
    joiner.call(this, data.user, 'Home', this.config.extensions.movement.home);
  }
};

module.exports = {
  handle: 'movement',
  init: stumble => {
    stumble.on('ready', () => {
      const conf = stumble.config.extensions.movement;

      if (conf.hasOwnProperty('home'))
        stumble.execute('movement::join', { channel: conf.home });
    });
  },
  extensions: [mvjoin],
  commands: [leave, join, afk, home]
};
