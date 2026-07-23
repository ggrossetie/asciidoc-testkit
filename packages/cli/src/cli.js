#!/usr/bin/env node
import { main } from './main.js'

const { exitCode, output } = await main(process.argv.slice(2))
if (output) console.log(output)
process.exitCode = exitCode