'use strict';

const leave = {
  handle: 'leave',
  exec: function leave (data) {
    const up = this.client.user.channel.parent;
    if (up) up.join();
    else data.user.sendMessage('I have no where to go.');
  }
};

const move = {
  handle: 'move',
  exec: function move (data) {
    if (data.message.length) {
      let channel = this.client.channelByName(data.message);

      if (!channel && (/^\d+$/).test(data.message)) {
        const id = parseInt(data.message, 10);
        channel = this.client.channelById(id);
      }

      if (channel) channel.join();
      else data.user.sendMessage('Could not find channel');
    } else data.user.sendMessage('Please provide a target channel');
  }
};

const join = {
  handle: 'join',
  exec: function join (data) {
    if (data.message) {
      this.invoke('move', data);
      return;
    }

    const src = this.client.user.channel;
    const dest = data.user.channel;

    if (src !== dest) dest.join();
    else data.user.sendMessage('Already here.');
  }
};

const afk = {
  handle: 'afk',
  exec: function afk (data) {
    const id = this.config.extensions.movement.afk;

    if (typeof id !== 'undefined') {
      const type = typeof id;
      let channel;

      switch (type) {
      case 'number':
        channel = this.client.channelById(id);
        break;
      case 'string':
        channel = this.client.channelByName(id);
        break;
      }

      if (channel) channel.join();
      else data.user.sendMessage('Specified AFK channel not found.');
    } else data.user.sendMessage('No AFK channel specified.');
  }
};

module.exports = {
  handle: 'movement',
  commands: [leave, move, join, afk]
};
