'use strict';

const markup = require('cheerio');

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

const getlinks = {
  handle: 'parser::getlinks',
  exec: data => getAttributes(data.html, 'a', 'href')
};

module.exports = {
  handle: 'parser',
  extensions: [htmltotext, getimages, getlinks]
};
