'use strict';

const EventEmitter = require('events').EventEmitter;
const Extension = require('./Extension');

module.exports = class StumbleCore extends EventEmitter {
  constructor () {
    super();
    this.extensions = {};
  }

  use (extension) {
    if (!extension || !Object.keys(extension).length)
      throw new Error('EXT: Attempted to use empty extension.');

    if (extension.block) {
      const handle = extension.handle;

      if (!handle)
        throw new Error('EXT: Attempted to add block without handle.');

      if (this.extensions.hasOwnProperty(handle))
        throw new Error(`EXT: Attempted to use duplicate [ ${handle} ].`);

      this.extensions[extension.handle] = (
        extension instanceof Extension ? extension : new Extension(extension)
      );
    }

    if (extension.init) extension.init(this);

    return this;
  }

  execute (handle, share, roll) {
    if (!this.extensions.hasOwnProperty(handle)) return null;

    const extension = this.extensions[handle];

    if (extension.hooks) {
      roll = extension.hooks.map(hook => this.execute(hook, share, roll));
    }

    return extension.block.call(this, share, roll || null);
  }
};
