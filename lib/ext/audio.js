'use strict';

const ffmpeg = require('fluent-ffmpeg');
const Stream = require('stream');

const nextfile = {
  handle: 'audio::nextfile',
  exec: function nextfile () {
    const queue = this.space.get('audio.queue');
    const next = queue.shift();

    if (next)
      this.execute('audio::playfile', { filename: next });
  }
};

const playfile = {
  handle: 'audio::playfile',
  exec: function playfile (data) {
    if (this.io.input) {
      if (this.config.audio.usequeue) {
        const queue = this.space.get('audio.queue');

        if (queue.length < (this.config.audio.maxqueue || 10))
          queue.push(data.filename);
      }

      return;
    }

    ffmpeg.ffprobe(data.filename, (error, meta) => {
      if (error) return;

      if (!this.io.input) {
        const conf = this.config.audio;
        const stream = meta.streams[0];

        this.space.set('audio.streaming', true);

        this.io.input = this.client.connection.inputStream({
          channels: stream.channels,
          sampleRate: stream.sample_rate,
          gain: conf.gain
        });

        this.io.input.on('finish', () => {
          this.execute('audio::stopfile');

          if (conf.usequeue && conf.autoplay)
            this.execute('audio::nextfile');
        });

        const pass = new Stream.PassThrough();
        // ffmpeg's PassThrough is missing an unpipe method.
        // (╯ರ ~ ರ）╯︵ ┻━┻
        // Another pipe ought to fix it.

        ffmpeg(data.filename)
          // default: PCM signed 16-bit little-endian
          .format(conf.format || 's16le')
          .pipe(pass);

        pass.on('end', () => {
          if (this.io.input) this.io.input.end();
        }).pipe(this.io.input);

        this.space.set('audio.pass', pass);
      }
    });
  }
};

const stopfile = {
  handle: 'audio::stopfile',
  exec: function stopfile () {
    if (this.space.get('audio.streaming')) {
      const pass = this.space.get('audio.pass');

      // Work around for noisey bits.
      this.io.input.setGain(0.01);

      pass.unpipe(this.io.input);
      pass.end();

      this.io.nullify('i');

      this.space.set('audio.streaming', false);
      this.space.set('audio.pass', null);
    }
  }
};

module.exports = {
  handle: 'audio',
  init: stumble => {
    stumble.space.set('audio.queue', []);
    stumble.space.set('audio.streaming', false);
    stumble.space.set('audio.pass', null);
  },
  term: stumble => {
    stumble.space.delete('audio.queue');
    stumble.space.delete('audio.streaming');
    stumble.space.delete('audio.pass');
  },
  extensions: [playfile, nextfile, stopfile]
};
