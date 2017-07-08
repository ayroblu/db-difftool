#!/usr/bin/env node

var options = require('minimist')(process.argv.slice(2))
var {genDb, diffDb} = require('./src')
var {help, tooMany} = require('./text')
var _ = require('lodash')

if (options._.length === 0 || (options.h || options.help)) {
  console.log(help)
  process.exit(0)
}
if (options._.length === 0 && (options.v || options.version)) {
  printVersionsAndExit()
}

const commands = options._
if (commands.length > 1) {
  console.error(tooMany)
  process.exit(1)
}

const config = {
  client: 'pg'
, connection: {
    host: options.H || options.host
  , port: options.p || options.port
  , username: options.U || options.username
  , password: options.P || options.password
  }
}
switch (commands[0]){
  case 'gen':
    genDb(config).catch(err=>{
      console.error('Error running', err)
    })
    process.exit()
  case 'read':
    diffDb(config).catch(err=>{
      console.error('Error running', err)
    })
    process.exit()
  default:
    process.exit(1)
}

function printVersionsAndExit() {
  console.log('db-difftool: ' + require('./package.json').version)
  process.exit()
}
