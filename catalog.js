const fs = require('fs');
const path = require('path');

const CATALOG_FILE_NAME = 'CATALOG.md'

console.log('process.env.CI', process.env.CI);

function pathJoin(...paths) {
  return paths.join('/')
}

function mdLink(linkText, linkAddr) {
  if (!linkAddr) linkAddr = linkText
  linkText = escapeMarkdownLinkText(linkText)

  if (process.env.CI) linkAddr = linkAddr.replace(/\.md$/, '')  // github pages的链接不要后缀.md
  linkAddr = encodeURI(linkAddr)

  return `[${linkText}](${linkAddr})  `
}

function escapeMarkdownLinkText(text) {
  return text.replace(/([$])/g, `\\$1`)
}

function parseFolder(rootPath) {
  let currLevelFolders = [];
  let currLevelFiles = [];

  const foldersAndFiles = fs.readdirSync(rootPath);
  for (let item of foldersAndFiles) {
    const itemFullPath = pathJoin(rootPath, item);
    const stat = fs.statSync(itemFullPath);

    if (stat.isDirectory()) {
      if (!shouldFolderExcluded(path.basename(itemFullPath))) {
        currLevelFolders.push(itemFullPath);
      }
    }

    if (stat.isFile()) {
      if (!shouldFileExcluded(path.basename(itemFullPath))) {
        currLevelFiles.push(itemFullPath)
      }
    }
  }

  return {
    folers: currLevelFolders,
    files: currLevelFiles
  }
}


function shouldFolderExcluded(folderName) {
  if (folderName.length > 1 && folderName[0] === '.') return true;
  if (folderName === 'assets') return true
  return false
}

function shouldFileExcluded(fileName) {
  const excludeFileNames = [
    CATALOG_FILE_NAME,
    '_README.md',
  ]
  if (fileName.length > 1 && fileName[0] === '.') return true;
  if (path.extname(fileName) !== '.md') return true
  if (excludeFileNames.find(x => x === fileName)) return true
  return false
}

function parseFolderTree(startPath) {
  let treeData = [{
    folderFullPath: startPath,
    parentFullPath: null,
    currLevelFiles: [],
    fileCnt: 0,
    subFolders: [],
  }];
  let folderList = [...treeData];
  let plainTextResult = [];

  let foldersToParse = [startPath];

  while (foldersToParse.length) {
    let parentFullPath = foldersToParse.shift();
    let parentNode = folderList.find(x => x.folderFullPath === parentFullPath)

    let parseResult = parseFolder(parentFullPath)
    foldersToParse.push(...parseResult.folers);
    parentNode.currLevelFiles = parseResult.files

    for (let SubFolderFullPath of parseResult.folers) {
      let subFolderTreeNode = {
        folderFullPath: SubFolderFullPath,
        parentFullPath: parentFullPath,
        currLevelFiles: [],
        fileCnt: 0,
        subFolders: [],
      }
      folderList.push(subFolderTreeNode)
      parentNode.subFolders.push(subFolderTreeNode)
    }

    while (parentNode) {
      parentNode.fileCnt += parseResult.files.length
      parentNode = folderList.find(x => x.folderFullPath === parentNode.parentFullPath)
    }

    plainTextResult.push(null)
    plainTextResult.push(`dir ${parentFullPath}`)
    plainTextResult.push(...parseResult.folers.concat(parseResult.files))
  }

  plainTextResult = plainTextResult.join('\n')

  return {
    treeData,
    folderList,
    plainTextResult
  }
}

// 在每个文件夹下创建CATALOG.mg
function catalogEachFolder(folderNode) {
  const mdFilePath = pathJoin(folderNode.folderFullPath, CATALOG_FILE_NAME)
  console.log(`generating: ${mdFilePath}`)

  let filesLines = folderNode.currLevelFiles.map(fileFullPath => {
    let fileName = path.basename(fileFullPath)
    return `${mdLink(fileName)}  `
  })
  let foldersLines = folderNode.subFolders.map(x => {
    let folderName = path.basename(x.folderFullPath)
    return x.fileCnt ?
      `${mdLink(folderName, pathJoin(folderName, CATALOG_FILE_NAME))}  ` :
      `${folderName}  `
  })

  let fileContent = [
    `# ${path.basename(folderNode.folderFullPath)}`,
    null,
    ...foldersLines,
    null,
    ...filesLines,
    null
  ]
  fs.writeFileSync(mdFilePath, fileContent.join('\n'))
}


function nChar(char, n = 1) {
  return Array.from({ length: n }, x => char).join('')
}

function catalogTotal(folderTreeData) {
  let resultLines = []
  resultLines.push(`## 目录`, null)
  function _catalogRecursive(folderTreeData, headingLevel = 2) {
    let nextHeadingLevel = headingLevel + 1;
    for (folderNode of folderTreeData) {
      if (!folderNode.fileCnt) continue;
      let filesLines = folderNode.currLevelFiles.map(fileFullPath => {
        return `${mdLink(path.basename(fileFullPath), fileFullPath)}`
      })

      let folderName = path.basename(folderNode.folderFullPath)
      let catalogFullPath = pathJoin(folderNode.folderFullPath, CATALOG_FILE_NAME)
      let _mdlink = mdLink(folderName, catalogFullPath)
      resultLines.push(`${nChar('#', headingLevel)} ${_mdlink})`)
      resultLines.push(null)
      resultLines.push(...filesLines)
      resultLines.push(null)
      _catalogRecursive(folderNode.subFolders, nextHeadingLevel)
    }
  }
  _catalogRecursive(folderTreeData)
  return resultLines
}

function concatReadme() {
  const _README = fs.readFileSync('./_README.md', { encoding: 'utf8' })
  let README = _README + '\n' + catalogTotalLines.join('\n')
  fs.writeFileSync('./README.md', README)
}

////////////////////////////////////////////////////

let treeResult = parseFolderTree('.')

if (!fs.existsSync('.temp')) fs.mkdirSync('.temp')
fs.writeFileSync('.temp/treeData.json', JSON.stringify(treeResult.treeData, null, 2));
fs.writeFileSync('.temp/folderList.json', JSON.stringify(treeResult.folderList, null, 2))
fs.writeFileSync('.temp/plainTextResult.txt', treeResult.plainTextResult)

const { folderList } = treeResult
for (folerNode of folderList) {
  // 根目录下的CATALOG.md单独生成
  if (folerNode.fileCnt && folerNode.folderFullPath !== '.') {
    catalogEachFolder(folerNode)
  }
}

const catalogTotalLines = catalogTotal(treeResult.treeData)
console.log(`generating: ${CATALOG_FILE_NAME}`);
fs.writeFileSync(CATALOG_FILE_NAME, catalogTotalLines.join('\n'))
console.log('concat Readme');
concatReadme(catalogTotalLines)


console.log('done');
