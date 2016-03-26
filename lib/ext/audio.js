'use strict';

const ffmpeg = require('fluent-ffmpeg');
const Stream = require('stream');

const playfile = {
  handle: 'audio::playfile',
  exec: function playfile (data) {
    if (this.io.input) return false;

    ffmpeg.ffprobe(data.filename, (error, meta) => {
      if (error) {
        if (data.done) data.done(true);
        return;
      }

      if (!this.io.input) {
        const conf = this.config.extensions.audio;
        const stream = meta.streams[0];

        this.space.set('audio.streaming', true);

        this.io.input = this.client.connection.inputStream({
          channels: stream.channels,
          sampleRate: stream.sample_rate,
          gain: conf.gain
        });

        const pass = new Stream.PassThrough();
        // ffmpeg's PassThrough is missing an unpipe method.
        // (╯ರ ~ ರ）╯︵ ┻━┻
        // Another pipe ought to fix it.

        ffmpeg(data.filename)
          // default: PCM signed 16-bit little-endian
          .format(conf.format || 's16le')
          .pipe(pass);

        let lived = true;

        pass.on('end', () => {
          if (this.space.get('audio.streaming'))
            this.execute('audio::stopfile');
          if (lived && data && data.done)
            data.done(true);
        }).on('kill', () => {
          if (data && data.done) data.done(false);
          lived = false;
          pass.end();
        }).pipe(this.io.input);

        this.space.set('audio.pass', pass);
      }
    });

    return true;
  }
};

const stopfile = {
  handle: 'audio::stopfile',
  exec: function stopfile (data) {
    if (this.space.get('audio.streaming')) {
      const pass = this.space.get('audio.pass');

      // Work around for noisey bits.
      this.io.input.setGain(0.01);

      pass.unpipe(this.io.input);
      if (data && data.force) pass.emit('kill');
      else pass.end();

      this.io.nullify('i');

      this.space.set('audio.streaming', false);
      this.space.set('audio.pass', null);
    }
  }
};

module.exports = {
  handle: 'audio',
  init: stumble => {
    stumble.space.set('audio.streaming', false);
    stumble.space.set('audio.pass', null);
  },
  term: stumble => {
    stumble.space.delete('audio.streaming');
    stumble.space.delete('audio.pass');
  },
  extensions: [playfile, stopfile]
};
