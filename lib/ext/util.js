'use strict';

const channelid = {
  handle: 'channel-id',
  exec: function channelid (data) {
    const id = data.user.channel.id;
    data.user.sendMessage(`You are in room [ ${id} ].`);
  }
};

module.exports = {
  handle: 'util',
  commands: [channelid]
};
