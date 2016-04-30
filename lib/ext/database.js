'use strict';

const path = require('path');
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
    const file = stumble.config.extensions.database.location;

    const location = (
      (typeof file === 'string') && (file !== ':memory:')
      ? path.resolve(file)
      : ':memory:'
    );

    const db = new SQLite3.Database(location, error => {
      if (error) {
        this.emit('error', error);

        switch (error.code) {
        case 'SQLITE_CANTOPEN':
          console.error('Could not open database file. Check your path.');
        default:
          throw error;
        }
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
