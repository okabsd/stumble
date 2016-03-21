'use strict';

const StumbleCore = require('./StumbleCore');
const Command = require('./Command');
const IO = require('./IO');

const mumble = require('mumble');

module.exports = class Stumble extends StumbleCore {
  constructor (config) {
    super();

    this.client = null;
    this.config = config;
    this.commands = {};
    this.io = new IO();
  }

  connect () {
    const conf = this.config.mumble;
    const addr = `mumble://${conf.server}:${conf.port}`;

    mumble.connect(addr, {}, (error, client) => {
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

  define (command) {
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

    console.log('<%s> %s', user.name, message);

    if (message.startsWith(lead)) {
      const pieces = message.substring(lead.length).split(' ');
      this.invoke(pieces.shift(), { user, rest: pieces.join(' ') });
    }
  }
};
