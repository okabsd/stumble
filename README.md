# Stumble

**A fully extensible robotic friend, for Mumble.**

[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads]][npm-url]

![logo](http://oka.io/images/stumble.png)

Stumble is a [Mumble][mumble] bot.

Stumble is built around the concept of _extensions_, allowing it to be extended to create just about any kind of bot.

With that said, a [Standard Extension Library][sel] is included, providing many useful features out of the box.

For a more complete introduction, and to learn everything you need to know about Stumble, please spend a little time reading the various articles the [wiki][wiki] has to offer.

## Quick Install

Stumble is a Node.js module.

To simply install Stumble as an application, take a look at [`stumble-cli`][cli], a thin command line wrapper. You'll want to read the article on [Configuring][configuring], as well.

If you plan on writing your own extensions, you should install it in your project, and then go check out the [API][api], and the documentation for [`stumble-core`][stumble-core].

```shell
$ npm install stumble (--no-optional) (--save-dev)
```

`--no-optional` will skip on installing Standard Extension Library dependencies.

If you run into trouble, please read the [Getting Started][getting-started] wiki article.

## Contributing

If you've found a bug, please raise an [issue][issues] about it.

If you want to help out with development, go ahead and fork the [repository][repo].

## License

Stumble is [licensed][license] as [MIT][mit].

---

Enjoy!

Colin 'Oka' Hall-Coates

[oka.io](http://oka.io/) | [@Okahyphen](https://twitter.com/Okahyphen)

[repo]: https://github.com/Okahyphen/stumble
[cli]: https://github.com/Okahyphen/stumble-cli
[stumble-core]: https://github.com/Okahyphen/stumble-core

[issues]: https://github.com/Okahyphen/stumble/issues
[wiki]: https://github.com/Okahyphen/stumble/wiki

[sel]: https://github.com/Okahyphen/stumble/wiki/Standard-Extension-Library
[api]: https://github.com/Okahyphen/stumble/wiki/API
[getting-started]: https://github.com/Okahyphen/stumble/wiki/Getting-Started
[configuring]: https://github.com/Okahyphen/stumble/wiki/Configuring

[license]: https://raw.githubusercontent.com/Okahyphen/stumble/master/LICENSE

[mumble]: http://wiki.mumble.info/wiki/Main_Page
[mit]: http://opensource.org/licenses/MIT

[npm-url]: https://www.npmjs.com/package/stumble
[npm-image]: http://img.shields.io/npm/v/stumble.svg
[npm-downloads]: http://img.shields.io/npm/dm/stumble.svg
