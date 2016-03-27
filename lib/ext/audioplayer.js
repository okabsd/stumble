'use strict';

const minmax = (lower, value, upper) => {
  return value < lower ? lower : value > upper ? upper : value;
};

const play = {
  handle: 'play',
  exec: function play (data) {
    const db = this.execute('database::use');
    const streaming = this.space.get('audio.streaming');
    const target = data.message;

    if (target) {
      db.get('SELECT * FROM audiofiles WHERE key=?', [target], (err, row) => {
        if (err || !row) {
          data.user.sendMessage(`Could not find [ ${target} ].`);
          return;
        }

        const conf = this.config.extensions.audioplayer;
        const queue = this.space.get('audioplayer.queue');
        const max = conf.maxqueue || 1;

        const prelen = queue.length;

        if (prelen < max) {
          queue.push(row);

          if (streaming || prelen)
            data.user.sendMessage(`[ ${row.key} ] added to the queue. \
                                ${queue.length}/${max} items in queue.`);

          if (!streaming) this.invoke('next', data);
        } else data.user.sendMessage('Queue is full.');
      });
    } else if (!streaming) {
      data.delay = 1;
      this.invoke('next', data);
    } else data.user.sendMessage('No key provided');
  }
};

const next = {
  handle: 'next',
  exec: function next (data) {
    const conf = this.config.extensions.audioplayer;
    const delay = (data.delay || conf.delay || 250);

    if (this.space.get('audio.streaming'))
      this.invoke('stop');

    const queue = this.space.get('audioplayer.queue');
    const first = queue[0];

    if (first && !this.io.input) {
      const aconf = this.config.extensions.audio;

      this.space.set('audio.streaming', true);

      setTimeout(() => {
        queue.shift();

        this.execute('audio::playfile', {
          filename: `${aconf.directory}/${first.dir}/${first.file}`,
          done: (error, lived) => {
            if (lived && conf.autoplay) this.invoke('next', { delay });
          }
        });
      }, delay);
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

const gain = {
  handle: 'gain',
  exec: function gain (data) {
    const conf = this.config.extensions.audio;

    if (data.message) {
      let ngain = parseInt(data.message, 10);

      if (ngain) {
        ngain = minmax(1, ngain, 100) / 100;

        if (this.space.get('audio.streaming'))
          this.io.input.setGain(ngain);

        conf.gain = ngain;
      }
    }

    data.user.sendMessage(`Current gain: [ ${(conf.gain * 100) >> 0} ].`);
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
  commands: [play, next, stop, gain]
};
