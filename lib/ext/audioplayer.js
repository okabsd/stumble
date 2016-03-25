'use strict';

// This will need the TODO: database extension.

const play = {
  handle: 'play',
  exec: function play (data) {
    const streaming = this.space.get('audio.streaming');
    if (data.message) {
      const conf = this.config.extensions.audioplayer;
      const queue = this.space.get('audioplayer.queue');
      const max = conf.maxqueue || 1;

      if (queue.length < max) {
        queue.push(data.message);

        if (streaming) {
          data.user.sendMessage(
                            `[ ${data.message} ] added to the queue. \
                            ${queue.length}/${max} items in queue.`);
        } else this.invoke('next', data);
      } else data.user.sendMessage('Queue is full.');
    } else if (!streaming) this.invoke('next', data);
  }
};

const next = {
  handle: 'next',
  exec: function next () {
    this.invoke('stop');

    const queue = this.space.get('audioplayer.queue');
    const first = queue[0];

    if (first) {
      const conf = this.config.extensions.audioplayer;
      const available = this.execute('audio::playfile', {
        // Hard coding, just for now. Needs DB wrap anyway.
        filename: `playground/${first}.mp3`,
        done: lived => {
          if (lived && conf.autoplay)
            setTimeout(() => this.invoke('next'), 200);
        }
      });

      if (available) queue.shift();
    }
  }
};

const stop = {
  handle: 'stop',
  exec: function stop () {
    if (this.space.get('audio.streaming'))
      this.execute('audio::stopfile', { force: true });
  }
};

function shorthand (message, user) {
  const conf = this.config.extensions.audioplayer;

  if (conf.operator && message.startsWith(conf.operator)) {
    message = message.substring(conf.operator.length);
    if (message) this.invoke('play', { user, message });
  }
}

module.exports = {
  handle: 'audioplayer',
  needs: ['database'],
  init: stumble => {
    stumble.space.set('audioplayer.queue', []);
    stumble.on('message', shorthand);
  },
  term: stumble => {
    stumble.space.delete('audioplayer.queue');
    stumble.removeListener('message', shorthand);
  },
  commands: [play, next, stop]
};
