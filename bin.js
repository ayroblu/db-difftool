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
  , user: options.U || options.user
  , password: options.P || options.password
  , database: options.d || options.database
  }
}
switch (commands[0]){
  case 'gen':
    genDb(config).then(res=>{
      console.log('Gen complete')
      process.exit()
    }).catch(err=>{
      console.error('Error running', err)
    })
    break
  case 'read':
    diffDb(config).then(res=>{
      console.log('Diff complete')
      process.exit()
    }).catch(err=>{
      console.error('Error running', err)
    })
    break
  default:
    console.error(`  Command not recognised: ${commands[0]}`)
    process.exit(1)
}

function printVersionsAndExit() {
  console.log('db-difftool: ' + require('./package.json').version)
  process.exit()
}
