'use strict';

const ffmpeg = require('fluent-ffmpeg');

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

        if (queue.length < 10)
          queue.push(data.filename);
      }

      return;
    }

    ffmpeg.ffprobe(data.filename, (error, meta) => {
      if (error) return;

      if (!this.io.input) {
        const conf = this.config.audio;
        const stream = meta.streams[0];

        this.io.input = this.client.connection.inputStream({
          channels: stream.channels,
          sampleRate: stream.sample_rate,
          gain: conf.volume
        });

        this.io.input.on('finish', () => {
          this.io.nullify('i');
          if (conf.usequeue && conf.autoplay)
            this.execute('audio::nextfile');
        });

        ffmpeg(data.filename)
          // default: PCM signed 16-bit little-endian
          .format(conf.format || 's16le')
          .pipe(this.io.input);
      }
    });
  }
};

module.exports = {
  handle: 'audio',
  init: stumble => stumble.space.set('audio.queue', []),
  term: stumble => stumble.space.dete('audio.queue'),
  extensions: [playfile, nextfile]
};
