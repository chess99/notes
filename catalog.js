const fs = require('fs');
const path = require('path');

const CATALOG_FILE_NAME = 'CATALOG.md'

console.log('process.env.CI', process.env.CI);

function pathJoin(...paths) {
  return paths.join('/')
}

function nChar(char, n = 1) {
  if (n < 0) n = 0;
  return Array.from({ length: n }, x => char).join('')
}

function mdLink(linkText, linkAddr) {
  if (!linkAddr) linkAddr = linkText
  linkText = stripPrefixIndex(linkText)
  linkText = escapeMarkdownLinkText(linkText)

  if (process.env.CI) linkAddr = linkAddr.replace(/\.md$/, '')  // github pages的链接不要后缀.md
  linkAddr = encodeURI(linkAddr)

  return `[${linkText}](${linkAddr})`
}

// 001-foo.md => foo.md
function stripPrefixIndex(string) {
  const match = string.match(/^\d+-(.*)/)
  return match ? match[1] : string
}

function escapeMarkdownLinkText(text) {
  return text.replace(/([$])/g, `\\$1`)
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

function getAllMdFilePath(path) {
  const treeResult = parseFolderTree(path)
  const { folderList } = treeResult
  let mdList = []
  folderList.forEach(folder => {
    mdList.push(...folder.currLevelFiles)
  })
  mdList = [...new Set(mdList)]
  return mdList
}

function getCatalogTotalLines(folderTreeData) {
  let resultLines = []
  resultLines.push(`## 目录`, null)
  const root = folderTreeData[0]
  for (let node of root.subFolders) {
    let lines = getCatalogLines(node)
    resultLines.push(...lines)
  }
  return resultLines
}

// 从 folderNode 开始, 递归地生成markdown的行
function getCatalogLines(rootNode, relativePath = false) {
  const INDENT_SPACES = 4
  const basePath = rootNode.folderFullPath
  let lines = []

  function _catalogRecursive(_folderNode, headingLevel = 0) {
    if (!_folderNode.fileCnt) return;
    let nextHeadingLevel = headingLevel + 1;

    // 当前文件夹的链接
    let folderPath = relativePath ? _folderNode.folderFullPath.replace(basePath, '.') : _folderNode.folderFullPath
    let catalogFilePath = pathJoin(folderPath, CATALOG_FILE_NAME);
    let folderName = path.basename(_folderNode.folderFullPath);
    let folderLink = mdLink(folderName, catalogFilePath);
    lines.push(`${nChar(' ', (headingLevel + 0) * INDENT_SPACES)}- ${folderLink}  `);

    // 当前文件夹内文件的链接
    let filesLines = _folderNode.currLevelFiles.map(fileFullPath => {
      let filePath = relativePath ? fileFullPath.replace(basePath, '.') : fileFullPath
      let fileLink = mdLink(path.basename(fileFullPath), filePath);
      return `${nChar(' ', (headingLevel + 1) * INDENT_SPACES)}- ${fileLink}  `;
    });
    if (filesLines.length) lines.push(...filesLines);

    // 递归子文件夹
    for (let subNode of _folderNode.subFolders) {
      _catalogRecursive(subNode, nextHeadingLevel)
    }
  }
  _catalogRecursive(rootNode)
  return lines
}

// 在每个文件夹下创建CATALOG.md
function catalogEachFolder(folderNode) {
  const mdFilePath = pathJoin(folderNode.folderFullPath, CATALOG_FILE_NAME)
  console.log(`generating: ${mdFilePath}`)

  let folderName = stripPrefixIndex(path.basename(folderNode.folderFullPath))
  let fileContent = [
    `# ${folderName}`,
    null,
    ...getCatalogLines(folderNode, /*relativePath*/true)
  ]
  fs.writeFileSync(mdFilePath, fileContent.join('\n'))
}

function concatReadme(catalogLines) {
  const _README = fs.readFileSync('./_README.md', { encoding: 'utf8' })
  let README = _README + '\n' + catalogLines.join('\n')
  fs.writeFileSync('./README.md', README)
}

function moveFileToDeployFolder() {
  const DEPLOY_FOLDER = 'gh_pages_deploy'

  function shouldMove(pathName) {
    if (pathName[0] === '.') return false
    if (pathName === DEPLOY_FOLDER) return false
    // if (/\.js(?:on)?$/.test(pathName)) return false
    return true
  }

  if (fs.existsSync(DEPLOY_FOLDER)) fs.rmdirSync(DEPLOY_FOLDER, { recursive: true })
  if (!fs.existsSync(DEPLOY_FOLDER)) fs.mkdirSync(DEPLOY_FOLDER)
  const files = fs.readdirSync('.')
  files.forEach(oldPath => {
    if (shouldMove(oldPath)) {
      let newPath = path.join(DEPLOY_FOLDER, oldPath)
      console.log(`${oldPath} => ${newPath}`);
      fs.renameSync(oldPath, newPath)
    }
  })
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

const catalogLines = getCatalogTotalLines(treeResult.treeData)
console.log(`generating: ${CATALOG_FILE_NAME}`);
fs.writeFileSync(CATALOG_FILE_NAME, catalogLines.join('\n'))
console.log('concat Readme');
concatReadme(catalogLines)

if (process.env.CI) moveFileToDeployFolder()

console.log('done');
