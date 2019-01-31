const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const stat = promisify(fs.stat)
const readdir = promisify(fs.readdir)

const loadFiles = (node, files) => {
  let dir = `/dropub/${Date.now()}`
  let count = 0

  let writeFiles = (dir, files) => {
    return node.files.mkdir(dir, {parents: true}).then(() => {     
      let tasks = []
      for (let fullpath of files) {
        tasks.push(stat(fullpath).then(stats => {
          let filename = path.basename(fullpath)
          if (stats.isDirectory()) {
            let newdir = dir + '/' + filename
            return readdir(fullpath).then(files => {
              return writeFiles(newdir, files.map(f => path.join(fullpath, f)))
            })
          } else if (stats.isFile()) {
            count += 1
            let file = fs.createReadStream(fullpath)
            return node.files.write(`${dir}/${filename}`, file, {create: true})
          }
        }))
      }
      return Promise.all(tasks)
    })    
  }
  return writeFiles(dir, files).then(() => ({dir, count}))
}

module.exports = loadFiles

