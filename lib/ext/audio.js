'use strict';

const path = require('path');

const ffmpeg = require('fluent-ffmpeg');
const Stream = require('stream');

const minmax = require('../gutil').minmax;

const playfile = {
  handle: 'audio::playfile',
  exec: function playfile (data) {
    if (this.io.input) return false;

    ffmpeg.ffprobe(data.filename, (error, meta) => {
      if (error) {
        if (data.done) data.done(error, true);
        return;
      }

      if (!this.io.input) {
        const conf = this.config.extensions.audio;
        const stream = meta.streams[0];
        const samples = 48000;

        this.space.set('audio.streaming', true);

        this.io.input = this.client.connection.inputStream({
          channels: stream.channels,
          sampleRate: samples,
          gain: minmax(0.01, conf.gain, 1.0)
        });

        const pass = new Stream.PassThrough();
        // ffmpeg's PassThrough is missing an unpipe method.
        // (╯ರ ~ ರ）╯︵ ┻━┻
        // Another pipe ought to fix it.

        ffmpeg(data.filename)
          .withAudioBitrate(stream.bit_rate)
          .withAudioFrequency(samples)
          .withAudioChannels(stream.channels)
          .format('s16le')
          .pipe(pass);

        let lived = true;

        pass
        .on('end', () => {
          if (lived) setTimeout(() => {
            this.execute('audio::stopfile');

            if (data.done) data.done(null, lived);
          }, 250);
        })
        .on('kill', () => {
          lived = false;

          if (data.done) data.done({
            code: 'APKILL',
            message: 'Audio playback was killed.',
          }, lived);

          pass.end();
        })
        .pipe(this.io.input);

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

const feedback = {
  handle: 'audio::feedback',
  init: stumble => stumble.space.set('audio.feedback', false),
  term: stumble => stumble.space.delete('audio.feedback'),
  exec: function feedback () {
    const feeding = this.space.get('audio.feedback');

    if (feeding) {
      this.io.output.unpipe(this.io.input);
      this.io.nullify('io');
      this.space.set('audio.feedback', false);
    } else if (!this.io.input && !this.io.output) {
      this.space.set('audio.feedback', true);
      this.io.input = this.client.connection.inputStream();
      this.io.output = this.client.connection.outputStream();
      this.io.output.pipe(this.io.input);
    }
  },
  commands: [{
    handle: 'feedback',
    exec: function feedback () {
      this.execute('audio::feedback');
    },
    info: () => `<pre>
USAGE: feedback

Toggles audio feedback, causing the bot
to repeat everything it hears.
    </pre>`
  }]
};

const mute = {
  handle: 'audio::mute',
  exec: function mute () {
    const value = !this.space.get('audio.muted');

    this.client.connection.sendMessage('UserState', {
      'self_mute': value
    });

    this.space.set('audio.muted', value);
  },
  commands: [{
    handle: 'mute',
    exec: function mute () {
      this.execute('audio::mute');
    },
    info: () => `<pre>
USAGE: mute

Toggles a self-mute on the bot.
  </pre>`
  }]
};

const gain = {
  handle: 'audio::gain',
  exec: function gain (data) {
    const conf = this.config.extensions.audio;

    if (Number.isInteger(data.gain)) {
      const ngain = minmax(1, data.gain, 100) / 100;

      if (this.space.get('audio.streaming'))
        this.io.input.setGain(ngain);

      conf.gain = ngain;
    }

    return conf.gain;
  },
  commands: [{
    handle: 'gain',
    exec: function gaincmd (data) {
      const level = this.execute('audio::gain', {
        gain: parseInt(data.message, 10)
      });

      data.user.sendMessage(`Current gain: [ ${(level * 100) >> 0} ].`);
    },
    info: () => `<pre>
USAGE: gain INTEGER

Sets the audio gain to an integer,
between 1 and 100 inclusive.
Going outside these bounds will set
the gain to the nearest extreme.
  </pre>`
  }]
};

module.exports = {
  handle: 'audio',
  init: stumble => {
    const conf = stumble.config.extensions.audio;
    conf.directory = path.resolve(conf.directory);
    conf.gain = minmax(0.01, conf.gain, 1.0);

    stumble.space.set('audio.streaming', false);
    stumble.space.set('audio.muted', false);
    stumble.space.set('audio.pass', null);
  },
  term: stumble => {
    stumble.space.delete('audio.streaming');
    stumble.space.delete('audio.muted');
    stumble.space.delete('audio.pass');
  },
  extensions: [playfile, stopfile, feedback, mute, gain]
};
