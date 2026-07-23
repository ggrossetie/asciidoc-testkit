#!/usr/bin/env node
import { main } from './main.js'

// Wrapped rather than using top-level await so this entry point can be
// bundled to CommonJS for the Single Executable Application build, where
// top-level await is not allowed.
main(process.argv.slice(2)).then(({ exitCode, output }) => {
  if (output) console.log(output)
  process.exitCode = exitCode
})