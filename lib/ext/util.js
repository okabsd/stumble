'use strict';

const yesno = require('../gutil').yesno;

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
    },
    info: () => `<pre>
USAGE: comment MESSAGE

Sets the comment with the value of MESSAGE.
    </pre>`
  }]
};

const channelid = {
  handle: 'channel-id',
  exec: function channelid (data) {
    const id = data.user.channel.id;
    data.user.sendMessage(`You are in room [ ${id} ].`);
  },
  info: () => `<pre>
USAGE: channel-id

Returns the numeric ID of the
invoking user's channel.
  </pre>`
};

const userdetails = {
  handle: 'user-details',
  exec: function userdetails (data) {
    const user = (
      data.message
      ? this.client.userByName(data.message)
      : data.user
    );

    if (!user)
      return void data.user.sendMessage(`User [ ${data.message} ] not found.`);

    data.user.sendMessage(`<pre>
Name          ${user.name}
ID            ${user.id || 'N/A'}
Hash          ${user.hash || 'N/A'}

In Channel    ${user.channel.name}

Can Talk?     ${yesno(user.canTalk())}
Can Hear?     ${yesno(user.canHear())}
Recording?    ${yesno(user.recording)}
    </pre>`);
  },
  info: () => `<pre>
USAGE: comment MESSAGE

Sets the comment with the value of MESSAGE.
  </pre>`
};

module.exports = {
  handle: 'util',
  extensions: [setcomment],
  commands: [channelid, userdetails]
};
