'use strict';

const fs = require('fs');
const path = require('path');

const gutil = require('../gutil');
const clog = gutil.clog;
const mkd = gutil.mkd;
const time = gutil.time;
const defaults = gutil.defaults;

const write = {
  handle: 'log::writeline',
  exec: function write (data) {
    if (!data.string) return;

    const fd = this.space.get('log.dailyfd');

    if (fd) fd.write(`${time()} >> ${data.string}.\n`);
  }
};

function messagehandler (message, user) {
  const stripped = this.execute('parser::stripimages', {
    html: message
  });

  const string = `<${user.name}> ${stripped}`;

  clog(string);

  this.execute('log::writeline', { string });
}

function errorhandler (error) {
  const message = defaults(error.message, 'An error occurred, but offered no message.');
  const code = defaults(error.code, -1);

  const output = `E::[ ${code} ]::{ ${message} }`;

  clog(output);

  this.execute('log::writeline', { string: output });
}

module.exports = {
  handle: 'log',
  needs: ['parser'],
  extensions: [write],
  init: stumble => {
    stumble.on('message', messagehandler);
    stumble.on('error', errorhandler);

    const dir = stumble.config.extensions.log.directory;

    if (dir)
      mkd(dir, error => {
        if (error)
          return void console.error('Error accessing logging folder.', error);

        const fname = `Stumble ${new Date().toDateString()}`;
        const pn = path.resolve(dir, fname);
        const fd = fs.createWriteStream(pn, { flags: 'a' });

        fd.write(`${time()} >> Log opened.\n`);

        stumble.space.set('log.dailyfd', fd);
        stumble.space.set('log.writable', true);
      });
  },
  term: stumble => {
    stumble.removeListener('message', messagehandler);
    stumble.removeListener('error', errorhandler);

    const fd = stumble.space.get('log.dailyfd');
    if (fd) fd.write(`${time()} >> Log closed.\n`);

    stumble.space.delete('log.dailyfd');
    stumble.space.delete('log.writable');
  }
};
