'use strict';

const load = {
  handle: 'system::load',
  exec: function load (data) {
    const status = this.execute('system::load', { extension: data.message });

    data.user.sendMessage(status.message);
  }
};

const unload = {
  handle: 'system::unload',
  exec: function unload (data) {
    const extension = data.message;
    const result = this.execute('system::unload', { extension });

    data.user.sendMessage(result ?
                          `Extension [ ${extension} ] unloaded.` :
                          `Extension [ ${extension} ] not currently loaded.`);
  }
};

module.exports = {
  handle: 'usersystem',
  needs: ['system'],
  commands: [load, unload]
};
