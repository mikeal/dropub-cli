const ipfs = require('ipfs')
const yargs = require('yargs')
const path = require('path')
const fs = require('fs')
const tmp = require('tmp')
const { promisify } = require('util')
const getPorts = promisify(require('get-ports'))

const loadFiles = require('./lib/load')

const createNode = async argv => {
  let ports = await getPorts([8010, 8020, 8030, 8040], 8079)
  let dir = tmp.dirSync().name
  let config = {
    Addresses: {
      Swarm: [
        `/ip4/0.0.0.0/tcp/${ports[0]}`,
        `/ip4/127.0.0.1/tcp/${ports[1]}/ws`
      ],
      API: `/ip4/127.0.0.1/tcp/${ports[2]}`,
      Gateway: `/ip4/127.0.0.1/tcp/${ports[3]}`
    }
  }
  let options = {
    repo: dir,
    config
  }
  let node = ipfs.createNode(options)
  node.ready = new Promise(resolve => node.on('ready', resolve))
  await node.ready
  return node
}

const put = async argv => {
  let node = await createNode(argv)
  let {dir, count} = await loadFiles(node, argv.files.map(f => path.join(process.cwd(), f)))
  let msg = `Serving ${count} file${count > 1 ? 's' : ''}.`
  msg += ` https://dropub.com/cid/${(await node.files.stat(dir)).hash}` 
  console.log(msg)
}

const get = async argv => {
  let node = await createNode(argv)
  argv.urls = argv.urls.filter(u => u.startsWith('http:') || u.startsWith('https:'))
  argv.cids = argv.cids.filter(u => !u.startsWith('http:') && !u.startsWith('https:'))
  for (let url of argv.urls) {
    if (!urls.startsWith('https://dropub.com/cid/')) throw new Error('Unknown domain or path in URL')
    argv.cids.push(url.slice('https://dropub.com/cid/'.length))
  }
  for (let cid of argv.cids) {
    console.log(await node.ls(cid))
  }
}

require('yargs')
  .command({
    command: 'put [files..]',
    aliases: ['p'],
    desc: 'Push files to dropub. Stays open to offer the file if login is not enabled',
    handler: put
  })
  .command({
    command: 'get [urls|cids..]',
    aliases: ['g'],
    desc: 'Get files from urls or cids',
    handler: get,
    builder: yargs => {
      yargs.option('download', {
        desc: 'Download the files locally',
        alias: 'd',
        default: true
      })
    }
  })
  .argv

