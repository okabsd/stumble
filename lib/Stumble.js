'use strict';

const StumbleCore = require('stumble-core');
const Mumble = require('mumble');

const BASE_EXTENSIONS = ['std'];

module.exports = class Stumble extends StumbleCore {
  constructor (config, extensions) {
    super(config);

    extensions = extensions || BASE_EXTENSIONS;

    if (extensions.length) {
      extensions = extensions.map(extension => require(`./ext/${extension}`));
      this.use(extensions);
    }
  }

  observe (message, user) {
    const lead = this.config.mumble.op;

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
