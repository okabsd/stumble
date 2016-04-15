'use strict';

const load = {
  handle: 'system::load',
  exec: function load (data) {
    const status = this.execute('system::load', { extension: data.message });

    data.user.sendMessage(status.message);
  },
  info: () => `<pre>
USAGE: system::load EXTENSION

Loads an extension from the Standard Extension Library.
  </pre>`
};

const unload = {
  handle: 'system::unload',
  exec: function unload (data) {
    const extension = data.message;
    const result = this.execute('system::unload', { extension });

    data.user.sendMessage(result ?
                          `Extension [ ${extension} ] unloaded.` :
                          `Extension [ ${extension} ] not currently loaded.`);
  },
  info: () => `<pre>
USAGE: system::unload EXTENSION

Unloads an extension from the Standard Extension Library.
  </pre>`
};

module.exports = {
  handle: 'usersystem',
  needs: ['system'],
  commands: [load, unload]
};
