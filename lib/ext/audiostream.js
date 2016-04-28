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

    const maxsize = data.maxsize;
    let size = 0;

    req
      .on('error', () => {
        if (!bailed) bail('An error occurred while downloading.');
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

        if (size > maxsize && !bailed) bail('Filesize too large.');
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
      if (error || row)
        return data.done({
          message: (
            error
            ? 'A database error occurred.'
            : `Key [ ${data.key} ] already exists in database.`
          )
        });

      const root = this.config.extensions.audio.directory;
      const usrdir = path.normalize(`${root}/${data.directory}`);

      fs.mkdir(usrdir, derr => {
        if (!derr) derr = { code: 'EFINE' };

        switch (derr.code) {
        case 'EFINE':
        case 'EEXIST':
          const maxsize = this.config.extensions.audiostream.maxsize;

          const prefix = data.directory.charAt(0).toUpperCase();
          const affix = data.key.charCodeAt(0);
          const timestamp = Date.now();

          const file = `${prefix}-${affix}-${timestamp}-${process.pid}`;
          const filename = path.normalize(`${usrdir}/${file}`);

          this.execute('audiostream::getfile', {
            maxsize,
            url: data.url,
            dest: filename,
            done: err => {
              if (err) return data.done(err);

              db.run('INSERT INTO audiofiles VALUES(?, ?, ?, ?)',
                [data.key, data.directory, file, timestamp], data.done);
            }
          });

          break;
        default: data.done(derr);
        }
      });
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
    const key = pieces.join(' ').trim();

    if (!key)
      return void data.user.sendMessage('Usage: save KEY_NAME AUDIO_URL');

    const uri = url.parse(last);

    if ((/^https?:?$/).test(uri.protocol) && uri.host && uri.path) {
      this.execute('audiostream::savefile', {
        key,
        directory: data.user.name,
        url: uri,
        done: error => data.user.sendMessage(
          error
          ? 'A database error occurred.'
          : `Success! Audio saved as [ ${key} ].`)
      });
    } else data.user.sendMessage(`Bad URL: [ ${uri.href || ''} ]`);
  },
  info: () => `<pre>
USAGE: save KEY_NAME AUDIO_URL

Saves an audio clip, provided via an AUDIO_URL,
and associates it with the KEY_NAME.
  </pre>`
};

const stream = {
  handle: 'stream',
  exec: function stream (data) {
    if (this.io.input)
      return void data.user.sendMessage('Audio output is busy.');

    const links = this.execute('parser::getlinks', { html: data.message });

    if (!links.length)
      return void data.user.sendMessage('No link provided.');

    const aconf = this.config.extensions.audio;
    const conf = this.config.extensions.audiostream;
    const filename = `${aconf.directory}/tempfile-${Date.now()}`;

    this.execute('audiostream::getfile', {
      url: links[0],
      dest: filename,
      maxsize: conf.maxsize,
      done: error => {
        if (error) return data.user.sendMessage(error.message);

        this.execute('audio::playfile', {
          filename,
          done: perr => {
            if (perr && perr.code !== 'APKILL')
              data.user.sendMessage('Audio output got tied up.');

            fs.unlink(filename);
          }
        });
      }
    });
  },
  info: () => `<pre>
USAGE: stream AUDIO_URL

Streams audio from a given AUDIO_URL.
  </pre>`
};

const rename = {
  handle: 'rename',
  exec: function rename (data) {
    if (!data.message) return;

    const db = this.execute('database::use');

    const target = data.message;

    db.get('SELECT * FROM audiofiles WHERE key=?', [target], (err, row) => {
      if (err || !row)
        return data.user.sendMessage(`Could not find [ ${target} ].`);

      let timer = null;

      const followup = (msg, usr) => {
        if (usr !== data.user) return;

        this.removeListener('message', followup);
        clearTimeout(timer);

        if (msg.startsWith(this.config.operator))
          return usr.sendMessage(`Unsafe operation sequence.
                          Aborting [ rename ].`);

        const newkey = this.execute('parser::htmltotext', {
          html: msg
        });

        if (newkey === row.key)
          return usr.sendMessage('Same key given. No update will take place.');

        db.run('UPDATE OR IGNORE audiofiles SET key=? WHERE key=?',
          [newkey, row.key], derr => {
            usr.sendMessage(derr ? 'Database error.' :
              `Success. [ ${row.key} ] renamed to [ ${newkey} ].`);

            if (derr) return;

            const pqueue = this.space.get('audioplayer.queue');

            if (pqueue && pqueue.length) pqueue.forEach(item => {
              if (item.row === row.key) item.row = newkey;
            });
          });
      };

      this.on('message', followup);

      timer = setTimeout(() => this.removeListener('message', followup), 5000);

      data.user.sendMessage(`The contents of your next message
        will set the new key value for [ ${row.key} ]. You have five seconds.`);
    });
  },
  info: () => `<pre>
USAGE: rename KEY_NAME

Renames an audio clip KEY_NAME to the value
provided in the next message.
  </pre>`
};

const fdelete = {
  handle: 'delete',
  exec: function fdelete (data) {
    if (!data.message) return;

    const db = this.execute('database::use');
    const target = data.message;

    db.get('SELECT * FROM audiofiles WHERE key=?', [target], (err, row) => {
      if (err || !row)
        return data.user.sendMessage(`Could not find [ ${target} ].`);

      const root = this.config.extensions.audio.directory;
      const fname = path.normalize(`${root}/${row.dir}/${row.file}`);

      const pqueue = this.space.get('audioplayer.queue');

      if (pqueue) for (let i = pqueue.length - 1; i >= 0; i--)
        if (pqueue[i].key === row.key) pqueue.splice(i, 1);

      fs.unlink(fname, ferr => {
        if (ferr)
          data.user.sendMessage('File not found! Continuing to delete key...');

        db.run('DELETE FROM audiofiles WHERE key=?', [row.key], derr => {
          data.user.sendMessage(derr ?
                        'A database error occurred.' : 'Removed key.');
        });
      });
    });
  },
  info: () => `<pre>
USAGE: delete KEY_NAME

Deletes the audio clip associated with the
specified KEY_NAME, and removes the KEY_NAME.
  </pre>`
};

module.exports = {
  handle: 'audiostream',
  needs: ['audio', 'database', 'parser'],
  init: stumble => {
    const db = stumble.execute('database::use');

    db.run(`
      CREATE TABLE IF NOT EXISTS audiofiles(
        key TEXT UNQIUE,
        dir TEXT,
        file TEXT,
        mstimestamp INTEGER
      )
    `);
  },
  extensions: [getfile, savefile],
  commands: [stream, save, rename, fdelete]
};
