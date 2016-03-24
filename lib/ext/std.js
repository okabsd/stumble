'use strict';

const path = require('path');

const STDLIBS = [
  'audio',
  'io',
  'log',
  'parser',
  'std',
  'stdextra',
  'time'
];

const load = {
  handle: 'std::load',
  exec: function load (data) {
    const ext = path.basename(data.extension, '.js');
    const status = { success: false };

    if (this.extensions.has(ext)) {
      status.message = `Extension named [ ${ext} ] already loaded. \
                        Cowardly refusing to attempt a load that will, \
                        without fail, fail.`;
    } else if (STDLIBS.indexOf(ext) > -1) {
      this.use(require(`${__dirname}/${ext}`));
      status.message = `Extension [ ${ext} ] loaded!`;
      status.success = true;
    } else {
      status.message = `Extension [ ${ext} ] not in the Stumble stdlib.`;
    }

    return status;
  }
};

const unload = {
  handle: 'std::unload',
  exec: function unload (data) {
    const ext = STDLIBS.indexOf(data.extension) > - 1
                && this.extensions.get(data.extension);

    if (ext) {
      const commands = ext.commands;

      if (commands)
        commands.forEach(command => this.commands.delete(command));

      const extensions = ext.extensions;

      if (extensions)
        extensions.forEach(extension => unload.call(this, { extension }));

      if (ext.term) ext.term.call(this, this);

      this.extensions.delete(data.extension);
    }

    return !!ext;
  }
};

module.exports = {
  handle: 'std',
  extensions: [load, unload]
};
