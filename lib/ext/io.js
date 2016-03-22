'use strict';

const feedback = {
  handle: 'io::feedback',
  init: stumble => stumble.space.set('feedback', false),
  term: stumble => stumble.space.delete('feedback'),
  exec: function feedback () {
    const feeding = this.space.get('feedback');

    if (feeding) {
      this.io.close();
      this.space.set('feedback', false);
    } else if (!this.io.input && !this.io.output) {
      this.io.input = this.client.connection.inputStream();
      this.io.output = this.client.connection.outputStream();
      this.io.output.pipe(this.io.input);
      this.space.set('feedback', true);
    }
  },
  commands: [{
    handle: 'feedback',
    exec: function feedback () {
      this.execute('io::feedback');
    }
  }]
};

module.exports = {
  handle: 'io',
  extensions: [feedback]
};
