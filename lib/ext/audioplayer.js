'use strict';

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
  exec: function next (data) {
    this.invoke('stop');

    const queue = this.space.get('audioplayer.queue');
    const first = queue[0];

    if (first && !this.io.input) {
      const db = this.execute('database::use');

      db.get('SELECT * FROM audiofiles WHERE key=?', [first], (err, row) => {
        const conf = this.config.extensions.audioplayer;

        queue.shift();

        if (err || !row) {
          if (data && data.user)
            data.user.sendMessage(`Could not find [ ${first} ].`);

          if (conf.autoplay) this.invoke('next');
        } else {
          this.execute('audio::playfile', {
            filename: `${conf.directory}/${row.dir}/${row.file}`,
            done: lived => {
              if (lived && conf.autoplay)
                setTimeout(() => this.invoke('next'), 200);
            }
          });
        }
      });
    } else if (data && data.user) data.user.sendMessage('Nothing to play.');
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
  needs: ['audio', 'database'],
  init: stumble => {
    stumble.space.set('audioplayer.queue', []);
    stumble.on('message', shorthand);

    const db = stumble.execute('database::use');

    db.run('CREATE TABLE IF NOT EXISTS audiofiles(key TEXT UNQIUE, dir TEXT, file TEXT)');
  },
  term: stumble => {
    stumble.space.delete('audioplayer.queue');
    stumble.removeListener('message', shorthand);
  },
  commands: [play, next, stop]
};
