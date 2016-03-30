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
      .on('error', err => {
        if (!bailed) bail(err.message);
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
          const maxsize = this.config.extensions.audiostream.maxsize;
          const file = `${data.directory[0].toUpperCase()}-${Date.now()}`;
          const filename = path.normalize(`${usrdir}/${file}`);

          this.execute('audiostream::getfile', {
            maxsize,
            url: data.url,
            dest: filename,
            done: err => {
              if (err) {
                data.done(err);
                return;
              }

              db.run('INSERT INTO audiofiles VALUES(?, ?, ?)',
                [data.key, data.directory, file], data.done);
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
      done: error => {
        if (error) {
          data.user.sendMessage(error.message);
          return;
        }

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
    } else data.user.sendMessage(`Bad URL: [ ${uri.href || ''} ]`);
  }
};

const rename = {
  handle: 'rename',
  exec: function rename (data) {
    if (!data.message) return;

    const db = this.execute('database::use');

    const target = data.message;

    db.get('SELECT * FROM audiofiles WHERE key=?', [target], (err, row) => {
      if (err || !row) {
        data.user.sendMessage(`Could not find [ ${target} ].`);
        return;
      }

      let timer;

      const followup = (msg, usr) => {
        if (usr === data.user) {
          this.removeListener('message', followup);
          clearTimeout(timer);

          if (msg.startsWith(this.config.operator)) {
            usr.sendMessage(`Unsafe operation sequence.
                            Aborting [ rename ].`);
            return;
          }

          const newkey = this.execute('parser::htmltotext', {
            html: msg
          });

          if (newkey === row.key) {
            usr.sendMessage('Same key given. No update will take place.');
            return;
          }

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
        }
      };

      this.on('message', followup);

      timer = setTimeout(() => this.removeListener('message', followup), 5000);

      data.user.sendMessage(`The contents of your next message
        will set the new key value for [ ${row.key} ]. You have five seconds.`);
    });
  }
};

const fdelete = {
  handle: 'delete',
  exec: function fdelete (data) {
    if (!data.message) return;

    const db = this.execute('database::use');
    const target = data.message;

    db.get('SELECT * FROM audiofiles WHERE key=?', [target], (err, row) => {
      if (err || !row) {
        data.user.sendMessage(`Could not find [ ${target} ].`);
        return;
      }

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
  commands: [stream, save, rename, fdelete]
};
