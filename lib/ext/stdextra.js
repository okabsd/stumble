'use strict';

const load = {
  handle: 'std::load',
  block: function load (data) {
    let response;

    try {
      this.execute('std::load', { extension: data.message });
      response = `Loaded [ ${data.message} ].`;
    } catch (e) {
      response = e.message;
    }

    data.user.sendMessage(response);
  }
};

const unload = {
  handle: 'std::unload',
  block: function unload (data) {
    let response;

    try {
      this.execute('std::unload', { extension: data.message });
      response = `Unloaded [ ${data.message} ].`;
    } catch (e) {
      response = e.message;
    }

    data.user.sendMessage(response);
  }
};

module.exports = {
  handle: 'stdextra',
  needs: ['std'],
  commands: [load, unload]
};
