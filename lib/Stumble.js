'use strict';

const StumbleCore = require('./core/StumbleCore');
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
};
