'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const request = require('request');
const filetype = require('file-type');

const getfile = {
  handle: 'audiostream::getfile',
  exec: function getfile (data) {
    const dest = fs.createWriteStream(data.dest);
    const req = request({uri: data.url});

    let bailed = false;

    const bail = (message) => {
      bailed = true;
      req.abort();
      fs.unlink(data.dest);
      data.done({ message });
    };

    let size = 0;
    const maxsize = data.maxsize;

    req
      .on('error', err => {
        if (!bailed)
          bail(err.message);
      })
      .once('data', chunk => {
        const fileinfo = filetype(chunk);

        if (!bailed) {
          if (!fileinfo)
            bail('Could not determine filetype. Write aborted.');
          else if (!(/audio\//i).test(fileinfo.mime))
            bail('Non-audio file detected. Write aborted.');
        }
      })
      .on('data', chunk => {
        size += chunk.length;

        if (!bailed && size > maxsize)
          bail('Filesize too large.');
      })
      .on('end', () => {
        if (!bailed) data.done(null);
      });

    req.pipe(dest);
  }
};

const savefile = {
  handle: 'audiostream::savefile',
  exec: function savefile (data) {
    const db = this.execute('database::use');

    db.get('SELECT 1 FROM audiofiles WHERE key=?', [data.key], (error, row) => {
      if (error || row) {
        data.done({
          message: error ? error.message : 'Key already exists in database.'
        });
        return;
      }

      const root = this.config.extensions.audio.directory;
      const usrdir = path.normalize(`${root}/${data.directory}`);

      fs.mkdir(usrdir, derr => {
        if (!derr) derr = { code: 'EFINE' };

        switch (derr.code) {
        case 'EFINE':
        case 'EEXIST':
          const file = `${usrdir[0].toUpperCase()}-${Date.now()}`;
          const filename = path.normalize(`${usrdir}/${file}`);

          this.execute('audiostream::getfile', {
            url: data.url,
            dest: filename,
            done: err => {
              if (err) data.done(err);

              db.run('INSERT INTO audiofiles VALUES(?, ?, ?)',
                [data.key, data.directory, file], e => data.done(e));
            }
          });

          break;
        default: data.done(derr);
        }
      });
    });
  }
};

const stream = {
  handle: 'stream',
  exec: function stream (data) {
    if (this.io.input) {
      data.user.sendMessage('Audio output is busy.');
      return;
    }

    const links = this.execute('parser::getlinks', { html: data.message });

    if (!links.length) {
      data.user.sendMessage('No link provided.');
      return;
    }

    const aconf = this.config.extensions.audio;
    const conf = this.config.extensions.audiostream;
    const filename = `${aconf.directory}/tempfile-${Date.now()}`;

    this.execute('audiostream::getfile', {
      url: links[0],
      dest: filename,
      maxsize: conf.maxsize,
      done: (error) => {
        if (error) {
          data.user.sendMessage(error.message);
          return;
        }

        const done = () => fs.unlink(filename);

        if (this.execute('audio::playfile', { filename, done })) return;

        done();
        data.user.sendMessage('Audio output got tied up.');
      }
    });
  }
};

const save = {
  handle: 'save',
  exec: function save (data) {
    if (!data.message) return;

    const parsed = this.execute('parser::htmltotext', {
      html: data.message
    });

    const pieces = parsed.split(' ');
    const last = pieces.pop();

    if (!pieces.length) {
      data.user.sendMessage('Usage: save KEY_NAME AUDIO_URL');
      return;
    }

    const uri = url.parse(last);

    if ((/^https?:?$/).test(uri.protocol) && uri.host && uri.path) {
      this.execute('audiostream::savefile', {
        key: pieces.join(' '),
        directory: data.user.name,
        url: uri,
        done: error => data.user.sendMessage(error ? error.message : 'Done!')
      });
    } else data.user.sendMessage('Bad URL.');
  }
};

module.exports = {
  handle: 'audiostream',
  needs: ['audio', 'database', 'parser'],
  init: stumble => {
    const db = stumble.execute('database::use');

    db.run('CREATE TABLE IF NOT EXISTS audiofiles(key TEXT UNQIUE, dir TEXT, file TEXT)');
  },
  extensions: [getfile, savefile],
  commands: [stream, save]
};
