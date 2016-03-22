'use strict';

const StumbleCore = require('./core/StumbleCore');
const BASE_EXTENSIONS = ['time'];

module.exports = class Stumble extends StumbleCore {
  constructor (config, extensions) {
    super(config);

    extensions = extensions || BASE_EXTENSIONS;

    extensions.forEach(extension => {
      this.use(require(`./ext/${extension}`));
    });
  }
};
