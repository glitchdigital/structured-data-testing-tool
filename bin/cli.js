#! /usr/bin/env node
const yargs = require('yargs')
const chalk = require('chalk')
const fs = require('fs')
const { structuredDataTest } = require('../index')
const presets = require('../presets')
const { schemas } = require('../lib/schemas')
const Package = require('../package')
const { error, printTestResults, printSupportedPresets, printListSchemas } = require('../lib/cli')

;(async () => {
  let showHelp = false
  let showInfo = false
  let testInput = null
  let testOutput = null
  let testOptions = {
    presets: [],
    schemas: [],
   }

   if (yargs.argv.help || yargs.argv.h) {
    showHelp = true
   }

   if (yargs.argv.info || yargs.argv.i) {
    showInfo = true
   }

   if (yargs.argv.output || yargs.argv.o) {
    if ((yargs.argv.output && yargs.argv.output !== true) || (yargs.argv.o && yargs.argv.o !== true)) {
      testOutput = yargs.argv.output || yargs.argv.o
    } else {
      console.error(error(`Error: Must specify a file to output to when using -o/--output`))
      return process.exit(1)
    }
   }

  // Get input arguments
  if ((yargs.argv.file && yargs.argv.file !== true) || (yargs.argv.f && yargs.argv.f !== true)) {
    if (yargs.argv.url || yargs.argv.u) {
      console.error(error(`Error: Must provide either URL (-u/--url) *or* file (-f/--file) to test, not both`))
      return process.exit(1)
    }

    // Get path to file input
    try {
      testInput = fs.readFileSync(yargs.argv.file || yargs.argv.f)
    } catch (e) {
      console.error(error(`Error: Unable to open file '${yargs.argv.file || yargs.argv.f}'`))
      return process.exit(1)
    }
  } else if ((yargs.argv.url && yargs.argv.url !== true) || (yargs.argv.u && yargs.argv.u !== true)) {
    // Get URL argument
    testInput = yargs.argv.url || yargs.argv.u
  }

  // If --schemas or -s is passed display supported schemas
  if (yargs.argv.schemas || yargs.argv.s) {
    if ((yargs.argv.schemas && yargs.argv.schemas === true) || (yargs.argv.s && yargs.argv.s === true)) {
      printListSchemas()
      return process.exit()
    }

    let schemaErrors = []
    let schemaArgs = yargs.argv.schemas || yargs.argv.s
    if (!Array.isArray(schemaArgs))
      schemaArgs = schemaArgs.split(',')

    schemaArgs.map(schema => {
      let [ structuredDataType, schemaName ] = schema.trim().split(':')
      if (!schemaName) {
        schemaName = structuredDataType
        structuredDataType = null
      }
      testOptions.schemas.push(schema)
      if (!schemas[schemaName]) {
        schemaErrors.push(`Warning: "${schemaName}" is not a valid schema.`)
      }
    })
  }

  // Parse presets of provided, and halt on error when parsing them
  if (yargs.argv.presets || yargs.argv.p) {
    // If --presets or -p is passed with no arguments, display supported presets
    if ((yargs.argv.presets && yargs.argv.presets === true) || (yargs.argv.p && yargs.argv.p === true)) {
      printSupportedPresets()
      return process.exit()
    }

    let presetErrors = []
    let presetArgs = yargs.argv.presets || yargs.argv.p
    if (!Array.isArray(presetArgs))
      presetArgs = presetArgs.split(',')
    presetArgs.map(preset => {
      if (presets[preset.trim()]) {
        testOptions.presets.push(presets[preset.trim()])
      } else {
        presetErrors.push(`Error: "${preset.trim()}" is not a valid preset.`)
      }
    })

    // If errors, display them and exit
    if (presetErrors.length > 0) {
      printSupportedPresets()
      presetErrors.map(err => console.error(error(err)))
      return process.exit(1)
    }
  }

  if (testInput && !showHelp) {
    // Run test
    await structuredDataTest(testInput, testOptions)
    .then(async (res) => {
      await printTestResults(res, { showInfo })
      if (testOutput)
        fs.writeFileSync(testOutput, JSON.stringify(res, null, 2))
      return process.exit()
    })
    .catch(async (err) => {
      if (err.type === 'VALIDATION_FAILED') {
        await printTestResults(err.res, { showInfo })
        if (testOutput)
          fs.writeFileSync(testOutput, JSON.stringify(err.res, null, 2))
      } else {
        // Handle other errors (e.g. fetching URL)
        if (yargs.argv.file || yargs.argv.f) {
          console.error(error(`Unable to open file "${yargs.argv.file || yargs.argv.f}"`))
        } else if (yargs.argv.url || yargs.argv.u) {
          console.error(error(`Unable to fetch content from "${yargs.argv.url || yargs.argv.u}"`))
        } else {
          throw err
        }
      }
      return process.exit(1)
    })
  }

  // if (yargs.argv.config && yargs.argv.config !== true) { }

  yargs
  .usage(`Usage: ${ chalk.yellowBright('$0 --url <url> [--presets <presets>] [--schemas <schemas]')}`)
  // .option('c', {
  //   alias: 'config',
  //   description: 'Use configuration file'
  // })
  .option('u', {
    alias: 'url',
    type: 'string',
    description: 'Inspect a URL'
  })
  .implies('--url', '--presets')
  .option('f', {
    alias: 'file',
    type: 'string',
    description: 'Inspect a file'
  })
  .implies('--file', '--presets')
  .option('p', {
    alias: 'presets',
    type: 'string',
    description: 'Test for specific markup from a list of presets'
  })
  .option('s', {
    alias: 'schemas',
    type: 'string',
    description: 'Test for a specific schema from a list of schemas'
  })
  .option('i', {
    alias: 'info',
    type: 'boolean',
    description: 'Show more detailed information about structured data found'
  })
  .option('o', {
    alias: 'output',
    type: 'string',
    description: 'Output test results to a file'
  })
  .help('h')
  .alias('h', 'help')
  .version(Package.version)
  .alias('v', 'version')
  .showHelpOnFail(true)
  .demandOption('--url or --file')
  .hide('--url or --file')
  //.example(chalk.cyan(`$0 --config path/to/config.js`), chalk.grey('Load URL(s) and tests from a configuration file'))
  .example(chalk.cyan(`$0 --url "https://example.com/article"`), chalk.grey('Inspect a URL'))
  .example(chalk.cyan(`$0 --url <url> --presets SocialMedia`), chalk.grey('Test a URL for social media metatags'))
  .example(chalk.cyan(`$0 --url <url> --presets Google`), chalk.grey('Test a URL for markup inspected by Google'))
  .example(chalk.cyan(`$0 --url <url> --presets "Twitter,Facebook"`), chalk.grey('Test a URL with multiple presets'))
  .example(chalk.cyan(`$0 --url <url> -p Twitter -p Facebook`), chalk.grey('Test a URL with multiple presets (alternative)'))
  .example(chalk.cyan(`$0 --url <url> --schemas Article`), chalk.grey('Test a URL for the Article schema'))
  .example(chalk.cyan(`$0 --url <url> --schemas "jsonld:Article"`), chalk.grey('Test a URL for the Article schema in JSON-LD'))
  .example(chalk.cyan(`$0 --url <url> --schemas "microdata:Article"`), chalk.grey('Test a URL for the Article schema in microdata/HTML'))
  .example(chalk.cyan(`$0 --url <url> --schemas "rdfa:Article"`), chalk.grey('Test a URL for the Article schema in RDFa'))
  .example(chalk.cyan(`$0 --url <url> --schemas "Article,WPHeader,WPFooter"`), chalk.grey('Test a URL for multiple schemas'))
  .example(chalk.cyan(`$0 --url <url> -s Article -s WPHeader -s WPFooter`), chalk.grey('Test a URL for multiple schemas (alternative)'))
  .example(chalk.cyan(`$0 --url <url> --output results.json`), chalk.grey('Output test results to a JSON file'))
  .example(chalk.cyan(`$0 --file <path-to-file>.html`), chalk.grey('Test file containing HTML'))
  .example(chalk.cyan(`$0 --file <path-to-file>.json`), chalk.grey('Test file containing JSON-LD'))
  .example(chalk.cyan(`$0 --presets`), chalk.grey('List all built-in presets'))
  .example(chalk.cyan(`$0 --schemas`), chalk.grey('List all supported schemas'))
  .wrap(120)
  .argv
  
})()
