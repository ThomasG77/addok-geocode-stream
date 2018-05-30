#!/usr/bin/env node
const yargs = require('yargs')
const {pipe} = require('mississippi')
const parse = require('csv-parser')
const stringify = require('csv-write-stream')
const {decodeStream} = require('./lib/decode')
const {createGeocodeStream} = require('.')

const {argv} = yargs
  .usage('$0 [options]')
  .detectLocale(false)
  .option('service', {
    describe: 'Set geocoding service URL',
    default: 'https://api-adresse.data.gouv.fr'
  })
  .option('columns', {
    describe: 'Select columns to geocode, in the right order',
    coerce: c => c.split(',')
  })
  .option('semicolon', {
    alias: 'semi',
    describe: 'Use semicolon (;) as separator',
    boolean: true
  })
  .option('tab', {
    describe: 'Use tabulation as separator',
    boolean: true
  })
  .option('concurrency', {
    describe: 'Set how many requests must be executed concurrently',
    type: 'number',
    coerce: v => {
      if (!v) {
        return 1
      }
      if (!v.match(/\d+/)) {
        throw new Error('Not supported value for concurrency')
      }
      const parsedValue = parseInt(v, 10)
      if (parsedValue <= 0) {
        throw new Error('Not supported value for concurrency')
      }
      return parsedValue
    },
    default: '1'
  })
  .option('encoding', {
    describe: 'Set data encoding. Can be detected automatically',
    choices: ['utf8', 'latin1']
  })

function getSeparator(argv) {
  if (argv.semicolon) {
    return ';'
  }
  if (argv.tab) {
    return '\t'
  }
  return ','
}

const separator = getSeparator(argv)
const {service, concurrency, columns} = argv

pipe(
  process.stdin,
  decodeStream(),
  parse({separator}),
  createGeocodeStream(service, {columns, concurrency, bucketSize: 200}),
  stringify({separator}),
  process.stdout,
  err => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
  }
)