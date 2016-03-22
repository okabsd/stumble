'use strict';

const Extension = require('./Extension');
const Command = require('./Command');
const IO = require('./IO');

const Mumble = require('mumble');
const EventEmitter = require('events').EventEmitter;

module.exports = class StumbleCore extends EventEmitter {
  constructor (config) {
    super();

    this.client = null;
    this.config = config;
    this.commands = {};
    this.extensions = {};
    this.io = new IO();
    this.space = new Map();
  }

  use (extension) {
    if (Array.isArray(extension)) {
      extension.forEach(ext => this.use(ext));
      return this;
    }

    if (!extension || !Object.keys(extension).length)
      throw new Error('EXT: Attempted to use empty extension.');

    if (extension.init) extension.init.call(this, this);

    const handle = extension.handle;
    const block = extension.block;

    if (!handle && block)
      throw new Error('EXT: Attempted to add block without handle.');

    if (this.extensions.hasOwnProperty(handle))
      throw new Error(`EXT: Attempted to use duplicate [ ${handle} ].`);

    if (handle) this.extensions[extension.handle] = (
      extension instanceof Extension ? extension : new Extension(extension)
    );

    return this;
  }

  execute (handle, share, roll) {
    if (!this.extensions.hasOwnProperty(handle)) return null;

    const extension = this.extensions[handle];

    if (!extension.block)
      throw new Error(`EXT: [ ${handle} ] has no executable block.`);

    if (extension.hooks) {
      roll = extension.hooks.map(hook => this.execute(hook, share, roll));
    }

    return extension.block.call(this, share, roll || null);
  }

  define (command) {
    if (Array.isArray(command)) {
      command.forEach(cmd => this.define(cmd));
      return this;
    }

    if (!command || !(command.handle && command.block))
      throw new Error('CMD: Attempted to define empty command.');

    const handle = command.handle;

    if (this.commands.hasOwnProperty(handle))
      throw new Error(`CMD: Attempted to define duplicate [ ${handle} ].`);

    if (/\s/.test(handle))
      throw new Error(`CMD: Whitespace in command [ ${handle} ].`);

    this.commands[handle] = (
      command instanceof Command ? command : new Command(command)
    );

    return this;
  }

  invoke (handle, data) {
    if (!this.commands.hasOwnProperty(handle)) return null;

    const command = this.commands[handle];
    return command.block.call(this, data);
  }

  observe (message, user) {
    const lead = this.config.mumble.msg.lead;

    if (message.startsWith(lead)) {
      const pieces = message.substring(lead.length).split(' ');
      this.invoke(pieces.shift(), { user, rest: pieces.join(' ') });
    }

    this.emit('message', message, user);
  }

  connect () {
    const conf = this.config.mumble;
    const addr = `mumble://${conf.server}:${conf.port}`;

    Mumble.connect(addr, {}, (error, client) => {
      if (error) {
        console.error(error);
        return;
      }

      client.authenticate(conf.username, conf.password);
      client.on('message', (message, user) => this.observe(message, user));

      this.client = client;

      this.emit('connected');
    });

    return this;
  }

  disconnect () {
    if (this.client) {
      this.io.close();
      this.client.disconnect();
      this.client = null;
      this.emit('disconnected');
    }

    return this;
  }
};
