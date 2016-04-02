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

module.exports = {
  handle: 'util',
  extensions: [setcomment],
  commands: [channelid]
};
