'use strict';

const CHOK = 0;
const CHNO = 1;
const CHSM = 2;

const messenger = (user, channel, flag) => {
  switch (flag) {
  default:
  case CHOK: return null;
  case CHNO: return user.sendMessage(`Channel [ ${channel} ] not found.`);
  case CHSM: return user.sendMessage('Already in channel.');
  }
};

const mvjoin = {
  handle: 'movement::join',
  exec: function mvjoin (data) {
    let channel = this.client.channelByName(data.channel);

    if (!channel && (/^\d+$/).test(data.channel))
      channel = this.client.channelById(parseInt(data.channel, 10));

    if (!channel)
      return CHNO;

    if (this.client.user.channel === channel)
      return CHSM;

    channel.join();
    return CHOK;
  }
};

const leave = {
  handle: 'leave',
  exec: function leave (data) {
    const up = this.client.user.channel.parent;

    if (up) up.join();
    else data.user.sendMessage('I have no where to go.');
  },
  info: () => `<pre>
USAGE: leave

Causes the bot to move to the parent channel
of its current channel.

Can not leave from root channel.
  </pre>`
};

const join = {
  handle: 'join',
  exec: function join (data) {
    const channel = data.message || data.user.channel.name;

    messenger(data.user, channel, this.execute('movement::join', { channel }));
  },
  info: () => `<pre>
USAGE:
      join
      join CHANNEL_ID
      join CHANNEL_NAME

Joins the specified channel.

If no channel specified, the bot will join
the the channel of the user who sent the message.
  </pre>`
};

function joiner (user, id, channel) {
  const type = typeof channel;
  const defined = type === 'string' || type === 'number';

  if (defined)
    messenger(user, channel, this.execute('movement::join', { channel }));
  else
    user.sendMessage(`No ${id} channel specified in config.`);
}

const afk = {
  handle: 'afk',
  exec: function afk (data) {
    joiner.call(this, data.user, 'AFK', this.config.extensions.movement.afk);
  },
  info: () => `<pre>
USAGE: afk

Sends the bot to the AFK channel,
specified in its configuration.
  </pre>`
};

const home = {
  handle: 'home',
  exec: function home (data) {
    joiner.call(this, data.user, 'Home', this.config.extensions.movement.home);
  },
  info: () => `<pre>
USAGE: home

Sends the bot to the Home channel,
specified in its configuration.
  </pre>`
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
