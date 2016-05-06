'use strict';

module.exports = extension => {
  switch (extension) {
  case 'audio':
  case 'audioplayer':
  case 'audiostream':
  case 'database':
  case 'info':
  case 'io':
  case 'log':
  case 'messenger':
  case 'movement':
  case 'parser':
  case 'permissions':
  case 'system':
  case 'time':
  case 'usersystem':
  case 'util':
    return true;
  default:
    return false;
  }
};
