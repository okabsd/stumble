'use strict';

const SQLite3 = require('sqlite3');

const use = {
  handle: 'database::use',
  exec: function use (data) {
    const dbname = data && data.db || 'main';
    const db = this.space.get(`database.${dbname}`);

    db.serialize();

    return db;
  }
};

module.exports = {
  handle: 'database',
  init: stumble => {
    const location = stumble.config.extensions.database.location || ':memory:';

    const db = new SQLite3.Database(location, null, err => {
      if (err) {
        console.error('Refusing to continue without suitible database:');
        throw err;
      }
    });

    stumble.space.set('database.main', db);
  },
  term: stumble => {
    const db = stumble.space.get('database.main');

    if (db.open) db.close();

    stumble.space.delete('database.main');
  },
  extensions: [use]
};
