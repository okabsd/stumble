'use strict';

const StumbleCore = require('stumble-core');
const dequire = StumbleCore.dequire;
const Mumble = require('mumble');

const IO = require('./IO');
const isstdlib = require('./stdlibs');

module.exports = class Stumble extends StumbleCore {
  constructor (config) {
    super();

    this.client = null;
    this.config = config;
    this.io = new IO();
    this.space = new Map();

    let extensions = Object.keys(config.extensions || { system: true })
                            .filter(isstdlib);

    if (extensions.length) {
      extensions = extensions.map(extension => dequire(`./ext/${extension}`));
      if (extensions.length) this.use(extensions);
    }
  }

  observe (message, user) {
    this.emit('message', message, user);

    const operator = this.config.operator;

    if (operator && message.startsWith(operator)) {
      const pieces = message.substring(operator.length).split(' ');
      const handle = pieces.shift();

      if (this.commands.has(handle)) {
        const data = { handle, user, message: pieces.join(' ') };

        if (this.space.has('_STANDARD_PERMISSIONS_'))
          this.execute('permissions::invoke', data);
        else
          this.invoke(handle, data);
      }
    }
  }

  connect () {
    const conf = this.config.mumble;
    const addr = `mumble://${conf.server}:${conf.port}`;

    Mumble.connect(addr, {}, (error, client) => {
      if (error)
        this.emit('connect-error', error);
      else {
        this.client = client;

        client.authenticate(conf.username, conf.password);

        client.on('ready', () => this.emit('ready'));
        client.on('message', (message, user) => this.observe(message, user));
        client.once('disconnect', () => this.disconnect(true));

        this.emit('connect', client);
      }
    });

    return this;
  }

  disconnect (evented) {
    if (this.client) {
      this.io.nullify('io');
      if (!evented) this.client.disconnect();
      this.client = null;
      this.emit('disconnect');
    }

    return this;
  }
};
