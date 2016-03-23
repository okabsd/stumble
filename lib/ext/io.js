'use strict';

const feedback = {
  handle: 'io::feedback',
  init: stumble => stumble.space.set('feedback', false),
  term: stumble => stumble.space.delete('feedback'),
  exec: function feedback () {
    const feeding = this.space.get('feedback');

    if (feeding) {
      this.io.output.unpipe(this.io.input);
      this.space.set('feedback', false);
      this.io.close();
    } else if (!this.io.input && !this.io.output) {
      this.space.set('feedback', true);
      this.io.input = this.client.connection.inputStream();
      this.io.output = this.client.connection.outputStream();
      this.io.output.pipe(this.io.input);
    }
  },
  commands: [{
    handle: 'feedback',
    exec: function feedback () {
      this.execute('io::feedback');
    }
  }]
};

const echo = {
  handle: 'echo',
  exec: data => data.user.sendMessage(data.message)
};

module.exports = {
  handle: 'io',
  extensions: [feedback],
  commands: [echo]
};
