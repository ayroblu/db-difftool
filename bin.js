#!/usr/bin/env node

var {run, runRead} = require('./genTree')

const args = process.argv.slice(2)

if (args.length === 0) {
  run().catch(err=>{
    console.error('Error running', err)
  })
} else if (args[0] === 'read'){
  runRead().catch(err=>{
    console.error('Error running', err)
  })
} else {
  console.log('Sorry, not sure what to do')
}
