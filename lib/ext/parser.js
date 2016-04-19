'use strict';

const markup = require('cheerio');
const defaults = require('../gutil').defaults;

function getAttributes (html, selector, attribute) {
  const butes = [];

  markup.load(html)(selector).each((_, el) => {
    const attr = el.attribs[attribute];
    if (attr) butes.push(attr);
  });

  return butes;
}

const htmltotext = {
  handle: 'parser::htmltotext',
  exec: data => markup.load(`<span id="Q">${data.html}</span>`)('#Q').text()
};

const getimages = {
  handle: 'parser::getimages',
  exec: data => getAttributes(data.html, 'img', 'src')
};

const stripimages = {
  handle: 'parser::stripimages',
  exec: function stripimages (data) {
    const mkup = markup.load(`<span id="Q">${data.html}</span>`);
    const maxlength = defaults(data.maxlength, 64);

    mkup('img').each((_, el) => {
      const src = el.attribs.src;

      if (src && src.length > maxlength) {
        el.attribs.src = '';
        el.attribs['data-src'] = 'Source too long to display.';
      }
    });

    return mkup('#Q').html();
  }
};

const getlinks = {
  handle: 'parser::getlinks',
  exec: data => getAttributes(data.html, 'a', 'href')
};

module.exports = {
  handle: 'parser',
  extensions: [htmltotext, getimages, stripimages, getlinks]
};
