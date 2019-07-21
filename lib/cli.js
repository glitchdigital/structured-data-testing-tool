const chalk = require('chalk')
const presets = require('../presets')

const info = chalk.white
const success = chalk.green
const warn = chalk.keyword('orange')
const error = chalk.red

function printTestResults(testResult) {

  const totalTests = testResult.passed.length + testResult.warnings.length + testResult.failed.length

  let testResultsGrouped = {}
  
  testResult.tests.map(test => {
    if (!testResultsGrouped[test.schema]) {
      testResultsGrouped[test.schema] = {
        passed: [],
        warnings: [],
        failed: []
      }
    }

    if (test.passed) {
      if (!testResultsGrouped[test.schema].passed.includes(test.test))
        testResultsGrouped[test.schema].passed.push(test.test)
    } else {
      if (test.warning) {
        if (!testResultsGrouped[test.schema].warnings.includes(test.test))
          testResultsGrouped[test.schema].warnings.push(test.test)
      } else {
        if (!testResultsGrouped[test.schema].failed.includes(test.test))
          testResultsGrouped[test.schema].failed.push(test.test)
      }
    }
  })

  console.log(`Tests\n`)

  Object.keys(testResultsGrouped).map(schema => {
    const totalTestsForSchema = testResultsGrouped[schema].passed.length + testResultsGrouped[schema].warnings.length + testResultsGrouped[schema].failed.length
    const percentageTestPassed = Math.floor((testResultsGrouped[schema].passed.length / totalTestsForSchema) * 100)

    console.log(
      ' ',
      (testResultsGrouped[schema].failed.length > 0) ? chalk.red.bold(`${schema}`) : chalk.green.bold(`${schema}`),
      info(`… ${testResultsGrouped[schema].passed.length } of ${totalTestsForSchema} (${percentageTestPassed}%)`)
    )
    testResultsGrouped[schema].passed.map(test => {
      console.log(success(`    ✓ `), info(`${test}`.replace(/""/g, '\'')))
    })
    testResultsGrouped[schema].warnings.map(test => {
      console.log(warn(`    • `), info(`${test}`.replace(/""/g, '\'')))
    })
    testResultsGrouped[schema].failed.map(test => {
      console.log(error(`    ✕ `), info(`${test}`.replace(/""/g, '\'')))
    })
    console.log('')
  })

  console.log(`Statistics\n`)
  console.log(info(`  Number of Metatags:`), `${Object.keys(testResult.structuredData.metatags).length || 0}`)
  console.log(info(`  Schemas in JSON-LD:`), `${Object.keys(testResult.structuredData.jsonld).length || 0}`)
  console.log(info(`     Schemas in HTML:`), `${Object.keys(testResult.structuredData.microdata).length || 0}`)
  console.log(info(`      Schema in RDFa:`), `${Object.keys(testResult.structuredData.rdfa).length || 0}`)
  console.log(info(`       Schemas found:`), `${testResult.schemas.join(', ')}`)
  console.log(info(`     Test suites run:`), `${Object.keys(testResultsGrouped).join(', ')}`)
  console.log(info(`     Total tests run:`), `${totalTests}`)
  console.log('')
  console.log(`Results\n`)
  console.log(info(`    Passed:`), `${testResult.passed.length}`, info(`(${Math.floor((testResult.passed.length / totalTests) * 100) || 0}%)`))
  console.log(info(`  Warnings:`), `${testResult.warnings.length}`, info(`(${Math.floor((testResult.warnings.length / totalTests) * 100) || 0}%)`))
  console.log(info(`    Failed:`), `${testResult.failed.length}`, info(`(${Math.floor((testResult.failed.length / totalTests) * 100) || 0}%)`))
  console.log('')

  if (totalTests === 0) {
    console.log(info(`  No tests run.\n`))
  } else if (testResult.failed.length === 0) {
    console.log(success(`  ✓ ${totalTests} tests passed with ${testResult.warnings.length} warnings.\n`))
  } else {
    console.error(chalk.red.bold(`  ✕ Failed ${testResult.failed.length} of ${testResult.passed.length + testResult.failed.length} tests.\n`));
    process.exit(1)
  }
}

function printSupportedPresets() {
  console.log('The following presets are supported:\n')
  Object.keys(presets).map(preset => {
    console.log(
      `  ${preset}`,
      info(`- ${presets[preset].description}`)
    )
  })
  console.log('')
  return
}

module.exports = {
  info,
  success,
  warn,
  error,
  printTestResults,
  printSupportedPresets
}