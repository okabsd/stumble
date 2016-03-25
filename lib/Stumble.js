'use strict';

const StumbleCore = require('stumble-core');
const Mumble = require('mumble');

const IO = require('./IO');
const STDLIBS = require('./stdlibs');

module.exports = class Stumble extends StumbleCore {
  constructor (config) {
    super();

    this.client = null;
    this.config = config;
    this.io = new IO();
    this.space = new Map();

    let extensions = Object.keys(config.extensions || { system: true })
                          .filter(extension => STDLIBS.indexOf(extension) > -1);

    if (extensions.length) {
      extensions = extensions.map(extension => require(`./ext/${extension}`));
      if (extensions.length) this.use(extensions);
    }
  }

  observe (message, user) {
    const operator = this.config.operator;

    if (operator && message.startsWith(operator)) {
      const pieces = message.substring(operator.length).split(' ');
      const handle = pieces.shift();

      if (this.commands.has(handle))
        this.invoke(handle, { user, message: pieces.join(' ') });
    }

    this.emit('message', message, user);
  }

  connect () {
    const conf = this.config.mumble;
    const addr = `mumble://${conf.server}:${conf.port}`;

    Mumble.connect(addr, {}, (error, client) => {
      if (error) console.error(error);
      else {
        client.authenticate(conf.username, conf.password);
        client.on('message', (message, user) => this.observe(message, user));

        this.client = client;

        this.emit('connected');
      }
    });

    return this;
  }

  disconnect () {
    if (this.client) {
      this.io.nullify('io');
      this.client.disconnect();
      this.client = null;
      this.emit('disconnected');
    }

    return this;
  }
};
