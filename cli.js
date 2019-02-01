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
    silent: true,
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
  let {dir, count} = await loadFiles(node, argv.files.map(f => {
    if (f[0] === '/') return f
    return path.join(process.cwd(), f)
  }))
  let msg = `Serving ${count} file${count > 1 ? 's' : ''}.`
  msg += ` https://dropub.com/cid/${(await node.files.stat(dir)).hash}` 
  console.log(msg)
  if (argv.duration !== Infinity) {
    setTimeout(() => {
      console.log('Duration limit reached, closing node.')
      node.stop()
    }, argv.duration * 1000)
  }
}

const fileTree = (node, query, fn) => {
  return node.ls(query).then(entries => {
    let tasks = []
    for (let entry of entries) {
      let fullpath = query + '/' + entry.name
      if (entry.type === 'dir') {
        tasks.push(fn(fullpath, entry).then(() => fileTree(node, fullpath, fn)))
      } else if (entry.type === 'file') {
        tasks.push(fn(fullpath, entry))
      }
    }
    return Promise.all(tasks)
  })
}

const stat = promisify(fs.stat)
const _mkdir = promisify(fs.mkdir)
const mkdir = async str => {
  try {
    let stats = await stat(str)
  } catch (e) {
    return _mkdir(str)
  }
}

const filereader = (node, path) => new Promise((resolve, reject) => {
  let reader = node.getReadableStream(path)
  reader.once('data', entry => {
    resolve(entry.content)
    reader.on('data', () => reject(new Error('More than one file for path')))
  })
  reader.on('error', reject)
  reader.on('end', () => reject(new Error('Ended without result')))
})

const get = async argv => {
  let node = await createNode(argv)
  argv.urls = argv.urls.filter(u => u.startsWith('http:') || u.startsWith('https:'))
  argv.cids = argv.cids.filter(u => !u.startsWith('http:') && !u.startsWith('https:'))
  for (let url of argv.urls) {
    if (!url.startsWith('https://dropub.com/cid/')) throw new Error('Unknown domain or path in URL')
    argv.cids.push(url.slice('https://dropub.com/cid/'.length))
  }
  let tasks = []
  let count = { dir: 0, file: 0 }
  for (let cid of argv.cids) {
    if (!argv.download) throw new Error('Only download is implemented')

    tasks.push(fileTree(node, cid, async (fullpath, entry) => {
      let trimpath = fullpath.slice(cid.length + 1)
      let localpath = path.join(argv.outputDir, trimpath)
      if (entry.type === 'dir') {
        await mkdir(localpath)
        count.dir += 1
      } else if (entry.type === 'file') {
        let reader =  await filereader(node, fullpath)   
        reader.resume() // why is this necessary?
        let writer = reader.pipe(fs.createWriteStream(localpath))
        count.file += 1
        return new Promise((resolve, reject) => {
          writer.on('close', resolve)
          writer.on('error', reject)
        })
      }
    }))
  }
  await Promise.all(tasks)
  node.stop()
  console.log(`Done! Created ${count.dir} directories and ${count.file} files.`)
}

require('yargs')
  .command({
    command: 'put [files..]',
    aliases: ['p'],
    desc: 'Push files to dropub. Stays open to offer the file if login is not enabled',
    handler: put,
    builder: yargs => {
      yargs.option('duration', {
        desc: 'Duration to offer the files',
        alias: 't',
        default: Infinity
      })
    }
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
      yargs.option('outputDir', {
        desc: 'Directory to download files locally',
        alias: 'o',
        default: process.cwd()
      })
    }
  })
  .argv

