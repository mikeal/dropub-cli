const { test } = require('tap')
const { exec, execSync } = require('child_process')
const path = require('path')

const cli = path.join(__dirname, '..', 'cli.js')

const serve = (...files) => {
  let putCommand = `node ${cli} put ${files.join(' ')}`
  return new Promise(resolve => {
    let child = exec(putCommand)
    child.stdout.once('data', str => {
      str = str.slice(0, str.indexOf('\n')) 
      resolve({url: str.slice(str.lastIndexOf(' ') + 1), child})
    })
  })
}

test('push and pull single file', async t => {
  let hello = path.join(__dirname, 'fixtures', 'hello.txt')
  let { url, child } = await serve(hello)
  let output = execSync(`node ${cli} get ${url}`)
  t.matchSnapshot(output, 'push and pull single file')
  child.kill('SIGKILL')
  console.error('ended')
  child.on('closed', () => console.error('exit'))
  while (!child.killed) console.error(Date.now(), 'not killed')
  console.error('killed')
})

