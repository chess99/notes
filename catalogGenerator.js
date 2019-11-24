const fs = require('fs');
const path = require('path');

const CATALOG_FILE_NAME = 'CATALOG.md'

function parseFolder(rootPath) {
  let currLevelFolders = [];
  let currLevelFiles = [];

  const foldersAndFiles = fs.readdirSync(rootPath);
  for (let item of foldersAndFiles) {
    const itemFullPath = path.join(rootPath, item);
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
  const mdFilePath = path.join(folderNode.folderFullPath, CATALOG_FILE_NAME)
  console.log(`generateCatalogMd: ${mdFilePath}`)

  let filesLines = folderNode.currLevelFiles.map(fileFullPath => {
    let fileName = path.basename(fileFullPath)
    return `[${fileName}](${encodeURIComponent(fileName)})  `
  })
  let foldersLines = folderNode.subFolders.map(x => {
    let folderName = path.basename(x.folderFullPath)
    return x.fileCnt ?
      `[${folderName}](${encodeURIComponent(path.join(folderName, CATALOG_FILE_NAME))})  ` :
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

function catalogTotal() {
  let resultLines = []
  resultLines.push(`## 目录`, null)
  function _catalogRecursive(folderTreeData, headingLevel = 2) {
    let nextHeadingLevel = headingLevel + 1;
    for (folderNode of folderTreeData) {
      if (!folderNode.fileCnt) continue;
      let filesLines = folderNode.currLevelFiles.map(fileFullPath => {
        return `[${path.basename(fileFullPath)}](${encodeURIComponent(fileFullPath)})  `
      })

      resultLines.push(`${nChar('#', headingLevel)} [${folderNode.folderFullPath}](${encodeURIComponent(path.join(folderNode.folderFullPath, CATALOG_FILE_NAME))})`)
      resultLines.push(null)
      resultLines.push(...filesLines)
      resultLines.push(null)
      _catalogRecursive(folderNode.subFolders, nextHeadingLevel)
    }
  }
  _catalogRecursive(treeResult.treeData)
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

const catalogTotalLines = catalogTotal()
fs.writeFileSync(CATALOG_FILE_NAME, catalogTotalLines.join('\n'))
concatReadme(catalogTotalLines)


console.log('done');
