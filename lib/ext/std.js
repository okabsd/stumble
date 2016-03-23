'use strict';

const path = require('path');

const load = {
  handle: 'std::load',
  exec: function load (data) {
    const ext = path.basename(data.extension, '.js');

    this.use(require(`${__dirname}/${ext}`));
  }
};

const unload = {
  handle: 'std::unload',
  exec: function unload (data) {
    const ext = this.extensions.get(data.extension);

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
  }
};

module.exports = {
  handle: 'std',
  extensions: [load, unload]
};
