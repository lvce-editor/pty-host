import { createIntegrationTest } from './src/IntegrationTestFramework.js'

async function debugTest() {
  console.log('Starting debug test...')
  
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $']
  })

  try {
    console.log('Starting integration test...')
    await integrationTest.start()
    console.log('Integration test started, ready:', integrationTest.isReady())
    console.log('Output so far:', JSON.stringify(integrationTest.getOutput()))
    
    console.log('Writing echo command...')
    await integrationTest.write('echo hello\n')
    
    console.log('Waiting for output...')
    await integrationTest.waitForOutput('hello')
    
    console.log('Final output:', JSON.stringify(integrationTest.getOutput()))
    console.log('Test completed successfully!')
  } catch (error) {
    console.error('Test failed:', error.message)
    console.log('Current output:', JSON.stringify(integrationTest.getOutput()))
    console.log('Current error:', JSON.stringify(integrationTest.getError()))
  } finally {
    await integrationTest.dispose()
  }
}

debugTest().catch(console.error)
