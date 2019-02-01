const { test } = require('tap')
const { spawn, sync } = require('cross-spawn')
const path = require('path')
const tmp = require('tmp')

const cli = path.join(__dirname, '..', 'cli.js')
const duration = '--duration=60'

const serve = (...files) => {
  let cmd = 'node'
  let args = [cli, 'put', duration, ...files]
  return new Promise(resolve => {
    let child = spawn(cmd, args)
    child.stdout.once('data', str => {
      str = str.slice(0, str.indexOf('\n')) 
      resolve({url: str.slice(str.lastIndexOf(' ') + 1), child})
    })
  })
}

test('push and pull single file', async t => {
  let hello = path.join(__dirname, 'fixtures', 'hello.txt')
  let { url, child } = await serve(hello)
  let cwd = tmp.dirSync().name
  let { stdout } = sync('node', [cli, 'get', url], {cwd})
  console.error(stdout.toString())
  t.matchSnapshot(stdout, 'push and pull single file')
  child.kill('SIGKILL')
})

