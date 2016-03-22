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
      const extensions = ext.extensions;
      const commands = ext.commands;

      if (extensions)
        extensions.forEach(extension => unload.call(this, { extension }));

      if (commands)
        commands.forEach(command => this.commands.delete(command));

      if (ext.term) ext.term.call(this, this);

      this.extensions.delete(data.extension);
    }
  }
};

module.exports = {
  handle: 'std',
  extensions: [load, unload]
};
