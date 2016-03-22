'use strict';

const load = {
  handle: 'std::load',
  exec: function load (data) {
    let response;

    try {
      this.execute('std::load', { extension: data.message });
      response = `Extension [ ${data.message} ] loaded.`;
    } catch (e) {
      response = `Could not load [ ${data.message} ].`;
    }

    data.user.sendMessage(response);
  }
};

const unload = {
  handle: 'std::unload',
  exec: function unload (data) {
    this.execute('std::unload', { extension: data.message });

    data.user.sendMessage(`Extension [ ${data.message} ] unloaded.`);
  }
};

module.exports = {
  handle: 'stdextra',
  needs: ['std'],
  commands: [load, unload]
};
