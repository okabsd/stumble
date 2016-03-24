'use strict';

const ffmpeg = require('fluent-ffmpeg');

const playfile = {
  handle: 'audio::playfile',
  exec: function playfile (data) {
    ffmpeg.ffprobe(data.filename, (error, meta) => {
      if (error) return;

      if (!this.io.input) {
        const stream = meta.streams[0];

        this.io.input = this.client.connection.inputStream({
          channels: stream.channels,
          sampleRate: stream.sample_rate,
          gain: 0.5
        });

        ffmpeg(data.filename)
          .format('s16le') // PCM signed 16-bit little-endian
          .on('end', () => this.io.close('input'))
          .pipe(this.io.input);
      }
    });
  },
  commands: [{
    handle: 'playfile',
    exec: function playfile (data) {
      this.execute('audio::playfile', { filename: data.message });
    }
  }]
};

module.exports = {
  handle: 'audio',
  extensions: [playfile]
};
