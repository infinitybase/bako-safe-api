# TAI64 &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/kevinpollet/typescript-node-module-starter/blob/master/LICENSE.md) [![Build Status](https://travis-ci.com/hl2/tai64.svg?token=tSMJcyr4W5f93JMvoe6S&branch=master)](https://travis-ci.com/hl2/tai64) [![Coverage Status](https://coveralls.io/repos/github/hl2/tai64/badge.svg?branch=master)](https://coveralls.io/github/hl2/tai64?branch=master)

⏱️ TypeScript implementation of TAI64 timestamps for [Node.js](https://nodejs.org/en/) and the browser.

> TAI refers to International Atomic Time (Temps Atomique International in French), the current international real-time standard. One TAI second is defined as the duration of `9192631770` periods of the radiation corresponding to the transition between the two hyperfine levels of the ground state of the cesium atom.

https://cr.yp.to/libtai/tai64.html#tai64

## Getting started

### Installation

```shell
npm install --save tai64
```

### Usage

```javascript
import { TAI64 } from "tai64";

const now = TAI64.now();
const moonLanding = TAI64.fromUnix(
  Math.floor(Date.parse("July 20, 69 00:20:18 UTC") / 1000)
);

console.log("Current date: %s", now.toHexString());
console.log("🚀🌝 Moon Landing: %s", moonLanding.toHexString());
```

## Implementation details

### Immutability

A TAI64 instance is immutable by design and can’t be modified after it’s created.

### Long dependency

In ECMAScript, a `Number` is represented as a [double-precision floating-point format number](http://en.wikipedia.org/wiki/Double_precision_floating-point_format) and the largest integer value that can be safely
represented is `2^53-1`. A TAI64 is an integer between `0` and `2^64` referring to a particular second of real time. For that reason, this project uses [long.js](https://github.com/dcodeIO/long.js) as a dependency. In future versions, we will investigate if we have to get rid of this dependency and if the [BigInt](https://github.com/tc39/proposal-bigint) proposal can be used.

## Further reading

- [UTC, TAI, and UNIX time](https://cr.yp.to/proto/utctai.html)
- [What’s this whole TAI64 thing about?](http://dyscour.se/post/12679668746/using-tai64-for-logging)
- [International Atomic Time](https://en.wikipedia.org/wiki/International_Atomic_Time)
- [Leap second](https://en.wikipedia.org/wiki/Leap_second)

## Contributing

Contributions are welcome 👍

Use the links below to request a feature, file a bug or contribute some code!

- Issues: https://github.com/hl2/tai64/issues
- Pull requests: https://github.com/hl2/tai64/pulls

## License

TAI64 is [MIT Licensed](./LICENSE.md).
