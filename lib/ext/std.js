'use strict';

const load = {
  handle: 'std::load',
  block: function load (data) {
    try {
      this.use(require(`${__dirname}/${data.extension}`));
    } catch (e) {
      throw new Error(`Can not find standard extension [ ${data.extension} ].`);
    }
  }
};

const unload = {
  handle: 'std::unload',
  block: function unload (data) {
    if (!this.extensions.has(data.extension))
      throw new Error(`EXT: Can not unload non-existent [${data.extension}].`);

    const ext = this.extensions.get(data.extension);
    const extensions = ext.extensions;
    const commands = ext.commands;

    if (extensions)
      extensions.forEach(extension => unload.call(this, { extension }));

    if (commands)
      commands.forEach(command => this.commands.delete(command));

    if (ext.cleanup) ext.cleanup.call(this, this);

    this.extensions.delete(data.extension);
  }
};

module.exports = {
  handle: 'std',
  extensions: [load, unload]
};
