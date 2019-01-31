const ipfs = require('ipfs')
const yargs = require('yargs')
const path = require('path')
const fs = require('fs')

let node = ipfs.createNode()
// TODO: use a tmpdir for storing the node data.
// TODO: search for open port
// Addresses: {
//     Swarm: [
//           '/ip4/0.0.0.0/tcp/4002',
//           '/ip4/127.0.0.1/tcp/4003/ws'
//     ],

node.ready = new Promise(resolve => node.on('ready', resolve))

const put = async argv => {
  await node.ready
  let dir = `/dropub/${Date.now()}`
  await node.files.mkdir(dir, {parents: true}) 
  
  for (let filename of argv.files) {
    let file = fs.createReadStream(path.join(__dirname, filename))
    await node.files.write(`${dir}/${filename}`, file, {create: true})
  }
  console.log(`Serving file${argv.files.length > 1 ? 's' : ''}. https://dropub.com/cid/${(await node.files.stat(dir)).hash}`)
}
const get = async argv => {
  console.log({get: argv})
  await node.ready
  console.log('test')
  argv.urls = argv.urls.filter(u => u.startsWith('http:') || u.startsWith('https:'))
  argv.cids = argv.cids.filter(u => !u.startsWith('http:') && !u.startsWith('https:'))
  console.log(argv)
  for (let url of argv.urls) {
    if (!urls.startsWith('https://dropub.com/cid/')) throw new Error('Unknown domain or path in URL')
    argv.cids.push(url.slice('https://dropub.com/cid/'.length))
  }
  console.log({cids: argv.cids})
  for (let cid of argv.cids) {
    console.log(await ipfs.ls(cid))
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

