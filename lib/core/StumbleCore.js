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
    this.commands = new Map();
    this.extensions = new Map();
    this.io = new IO();
    this.space = new Map();
  }

  use (extension) {
    if (Array.isArray(extension)) extension.forEach(ext => this.use(ext));
    else {
      if (!extension || !Object.keys(extension).length)
        throw new Error('EXT: Attempted to use empty extension.');

      const extensions = extension.extensions;
      const commands = extension.commands;
      const init = extension.init;

      extension = new Extension(extension);

      if (extension.needs) {
        extension.needs.forEach(ext => {
          if (!this.extensions.has(ext))
            throw new Error(`EXT: Missing required [ ${ext} ].`);
        });
      }

      const handle = extension.handle;

      if (this.extensions.has(handle))
        throw new Error(`EXT: Attempted to use duplicate [ ${handle} ].`);

      if (init) init.call(this, this);

      const block = extension.block;

      if (!handle && block)
        throw new Error('EXT: Attempted to add block without handle.');

      if (!handle && extensions)
        throw new Error('EXT: Attempted to add extensions without handle.');

      if (extensions) {
        this.use(extensions);
        extension.extensions = extensions.map(ext => ext.handle);
      }

      if (!handle && commands)
        throw new Error('EXT: Attempted to add commands without handle.');

      if (commands) {
        this.define(commands);
        extension.commands = commands.map(cmd => cmd.handle);
      }

      if (handle) this.extensions.set(handle, extension);
    }

    return this;
  }

  execute (handle, share, roll) {
    if (!this.extensions.has(handle))
      throw new Error(`EXT: Attempted to invoke missing [ ${handle} ]`);

    const extension = this.extensions.get(handle);

    if (!extension.block)
      throw new Error(`EXT: [ ${handle} ] has no executable block.`);

    if (extension.hooks) {
      roll = extension.hooks.map(hook => this.execute(hook, share, roll));
    }

    return extension.block.call(this, share, roll || null);
  }

  define (command) {
    if (Array.isArray(command)) command.forEach(cmd => this.define(cmd));
    else {
      if (!command || !(command.handle && command.block))
        throw new Error('CMD: Attempted to define empty command.');

      const handle = command.handle;

      if (this.commands.has(handle))
        throw new Error(`CMD: Attempted to define duplicate [ ${handle} ].`);

      if (/\s/.test(handle))
        throw new Error(`CMD: Whitespace in command [ ${handle} ].`);

      this.commands.set(handle, (
        command instanceof Command ? command : new Command(command)
      ));
    }

    return this;
  }

  invoke (handle, data) {
    if (!this.commands.has(handle))
      throw new Error(`CMD: Attempted to invoke missing [ ${handle} ]`);

    const command = this.commands.get(handle);
    return command.block.call(this, data);
  }

  observe (message, user) {
    const lead = this.config.mumble.msg.lead;

    if (message.startsWith(lead)) {
      const pieces = message.substring(lead.length).split(' ');
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
      this.io.close();
      this.client.disconnect();
      this.client = null;
      this.emit('disconnected');
    }

    return this;
  }
};
