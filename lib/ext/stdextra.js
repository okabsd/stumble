'use strict';

const load = {
  handle: 'std::load',
  exec: function load (data) {
    const status = this.execute('std::load', { extension: data.message });

    data.user.sendMessage(status.message);
  }
};

const unload = {
  handle: 'std::unload',
  exec: function unload (data) {
    const extension = data.message;
    const result = this.execute('std::unload', { extension });

    data.user.sendMessage(result ?
                          `Extension [ ${extension} ] unloaded.` :
                          `Extension [ ${extension} ] not currently loaded.`);
  }
};

module.exports = {
  handle: 'stdextra',
  needs: ['std'],
  commands: [load, unload]
};
