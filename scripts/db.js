'use strict'

require('shelljs/make')

const BABEL_CONFIG = {
  presets: [
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    'babel-plugin-dynamic-import-node',
    '@babel/plugin-transform-modules-commonjs'
  ]
}

require('@babel/register')(BABEL_CONFIG)

const pkg = require('../package.json')
const { check, say } = require('./util')('db')
const { join, dirname, relative } = require('path')
const { compact, strftime } = require('../src/common/util')
const home = join(__dirname, '..')
const cwd = process.cwd()
const SCHEMA = join(home, 'db', 'schema')
const MIGRATE = join(home, 'db', 'migrate')

const APPLICATION_ID = Buffer.from([0xDA, 0xED, 0xA1, 0x05]).readInt32BE()

require('../src/common/log').createLogger({ level: 'warn' })

global.ARGS = global.ARGS || {
  environment: 'production',
  locale: 'en'
}

target.create = async (args = []) => {
  const { Database } = require('../src/common/db')
  const domain = args[0] || 'project'
  const file = args[1] || join(home, 'db', `${domain}.db`)

  rm('-f', file)

  switch (domain) {
    case 'project': {
      const { create } = require('../src/models/project')
      const name = args[2] || 'Minos'
      const path = await Database.create(file, create, { name })
      say(`created project "${name}" as ${relative(cwd, path)}`)
      break
    }

    case 'ontology': {
      const { create } = require('../src/models/ontology')
      const path = await Database.create(file, create)
      say(`created ontology as ${relative(cwd, path)}`)
      break
    }
  }
}

target.migrate = async (args = []) => {
  const { Database } = require('../src/common/db')

  const domain = args[0] || 'project'
  const schema = join(SCHEMA, `${domain}.sql`)
  const tmp = join(home, 'tmp.db')

  rm('-f', tmp)
  rm('-f', schema)

  const db = new Database(tmp)

  try {
    await db.migrate(join(MIGRATE, domain))
    const version = await db.version()

    ;(`--
-- This file is auto-generated by executing all current
-- migrations. Instead of editing this file, please create
-- migrations to incrementally modify the database, and
-- then regenerate this schema file.
--
-- To create a new empty migration, run:
--   node scripts/db migration -- ${domain} [name] [sql|js]
--
-- To re-generate this file, run:
--   node scripts/db migrate
--

PRAGMA encoding = 'UTF-8';
PRAGMA application_id = ${APPLICATION_ID};

-- Save the current migration number
PRAGMA user_version = ${version};

-- Load sqlite3 .dump
`
    ).to(schema)

    exec(`sqlite3 ${tmp} .dump >> ${schema}`)
    'PRAGMA foreign_keys=ON;'.toEnd(schema)

    say(`migrated ${domain} to #${version}`)
    say(`schema saved as ${relative(cwd, schema)}`)

  } catch (error) {
    say(`migration failed: ${error.message}`)
    say(error.stack)
  } finally {
    if (db) await db.close()
    rm(tmp)
  }
}

target.viz = async (args = []) => {
  const { Database } = require('../src/common/db')

  const domain = args[0] || 'project'
  const file = args[1] || join(home, 'db', `${domain}.db`)
  const pdf = args[2] || join(home, 'doc', `${domain}.db.pdf`)
  const viz = join(home, 'node_modules', '.bin', 'sqleton')

  check(test('-f', file), `${file} not found`)
  mkdir('-p', dirname(pdf))

  const db = new Database(file)

  try {
    const version = await db.version()

    exec([
      viz,
      `-t "${pkg.productName} ${domain}#${version}"`,
      '-f "Helvetica Neue"',
      `-o ${pdf}`,
      file
    ].join(' '))

    say(`${domain} visual saved as ${relative(cwd, pdf)}`)

    return [pdf, version]

  } finally {
    await db.close()
  }
}

target.migration = (args = []) => {
  const domain = args[0] || 'project'
  const name = args[1]
  const type = args[2] || 'sql'
  const file = migration(name, type)
  const path = join(MIGRATE, domain, file)

  if (type === 'js') {
    (`
module.exports = {
  async up(tx) {
  }
}`).to(path)
  } else {
    ('').to(path)
  }

  say(`migration saved as ${relative(cwd, path)}`)
}

target.all = async (args = []) => {
  await target.migrate(args)
  await target.create(args)
  await target.viz(args)
}

function migration(name, type) {
  check(type === 'sql' || type === 'js',
    `migration type '${type}' not supported`)
  return compact([strftime('%y%m%d%H%M'), name, type]).join('.')
}

module.exports = Object.assign({}, target)
