'use strict';

const fs = require('fs');
const path = require('path');

const StumbleCore = require('stumble-core');
const dequire = StumbleCore.dequire;
const Mumble = require('mumble');

const IO = require('./IO');
const isstdlib = require('./stdlibs');
const clone = require('./gutil').clone;

module.exports = class Stumble extends StumbleCore {
  constructor (config) {
    super();

    this.__mumbleopts = {};

    this.client = null;
    this.config = config;
    this.io = new IO();
    this.space = new Map();

    const extensions = config.extensions || { system: true };
    const standards = Object.keys(extensions)
                            .filter(name => extensions[name] && isstdlib(name));

    if (standards.length)
      this.use(standards.map(extension => dequire(`./ext/${extension}`)));

    ['key', 'cert'].forEach(prop => {
      if (config.mumble.hasOwnProperty(prop)) try {
        this.__mumbleopts[prop] = fs.readFileSync(path.resolve(config.mumble[prop]));
      } catch (e) {
        console.warn(`Could not read [ ${prop} ] file. Check your paths.`);
      }
    });
  }

  observe (message, user) {
    this.emit('message', message, user);

    const operator = this.config.operator;

    if (operator && message.startsWith(operator)) {
      const pieces = message.substring(operator.length).split(' ');
      const handle = pieces.shift();

      if (this.commands.has(handle) || this.aliases.has(handle)) {
        const data = { handle, user, message: pieces.join(' ') };

        if (this.space.has('_STANDARD_PERMISSIONS_'))
          this.execute('permissions::invoke', data);
        else
          this.invoke(handle, data);
      } else user.sendMessage(`Command [ ${handle} ] not found.`);
    }
  }

  connect () {
    const conf = this.config.mumble;
    const addr = `mumble://${conf.server}:${conf.port}`;

    // Mumble.connect mutates the options argument. (◕︵◕)
    Mumble.connect(addr, clone(this.__mumbleopts), (error, client) => {
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
