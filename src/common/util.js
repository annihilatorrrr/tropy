'use strict'

const B = require('bluebird')
const pad = require('string.prototype.padstart')
const { keys } = Object

module.exports = {

  once(emitter, event) {
    return new B((resolve, reject) => {
      const on =
        (emitter.on || emitter.addEventListener).bind(emitter)
      const off =
        (emitter.removeListener || emitter.removeEventListener).bind(emitter)

      function success(...args) {
        off(event, success)
        off('error', failure)

        resolve(...args)
      }

      function failure(...args) {
        off(event, success)
        off('error', failure)

        reject(...args)
      }

      on('error', failure)
      on(event, success)
    })
  },

  times(n, fn) {
    for (var i = 0, res = []; i < n; ++i) res.push(fn(i))
    return res
  },

  splice(array, at, count = 0, ...items) {
    return [...array.slice(0, at), ...items, ...array.slice(at + count)]
  },

  sort(array, ...args) {
    return [...array].sort(...args)
  },

  flatten(obj) {
    const res = {}

    function reduce(cur, prop = '') {
      if (Object(cur) !== cur) res[prop] = cur
      else for (let p in cur) reduce(cur[p], prop ? `${prop}.${p}` : p)

      return res
    }

    return reduce(obj)
  },

  pick(src, props = [], into = {}) {
    return props.reduce((res, key) => {
      if (src.hasOwnProperty(key)) {
        res[key] = src[key]
      }

      return res

    }, into)
  },

  omit(src, props = [], into = {}) {
    return module.exports.pick(src,
      // eslint-disable-next-line eqeqeq
      keys(src).filter(key => !props.find(prop => prop == key)), into)
  },

  map(src, fn, into = {}) {
    //if (typeof fn !== 'function') fn = () => fn

    for (let prop in src) {
      if (src.hasOwnProperty(prop)) {
        into[prop] = fn(prop, src[prop], src)
      }
    }

    return into
  },

  noop() {},

  id(payload) { return payload },

  strftime(format, date = new Date()) {
    return format.replace(/%([YymdHMS])/g, (match, code) => {
      switch (code) {
        case 'Y':
          return pad(date.getFullYear(), 4, '0')
        case 'y':
          return pad(date.getFullYear() % 100, 2, '0')
        case 'm':
          return pad(date.getMonth() + 1, 2, '0')
        case 'd':
          return pad(date.getDate(), 2, '0')
        case 'H':
          return pad(date.getHours(), 2, '0')
        case 'M':
          return pad(date.getMinutes(), 2, '0')
        case 'S':
          return pad(date.getSeconds(), 2, '0')
        default:
          return match
      }
    })
  }

}
