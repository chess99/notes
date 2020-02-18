const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('process.env.CI', process.env.CI);
const CATALOG_FILE_NAME = 'README.md'
const CATALOG_EACH_FOLDER = true

////////////////////////// 策略 //////////////////////////

function shouldFolderExcluded(folderName) {
  if (folderName.length > 1 && folderName[0] === '.') return true;
  if (folderName === 'assets') return true
  if (folderName === 'node_modules') return true
  return false
}

function shouldFileExcluded(itemFullPath) {
  const fileName = path.basename(itemFullPath)
  const excludeFileNames = [
    CATALOG_FILE_NAME,
    '_README.md',
  ]
  if (fileName.length > 1 && fileName[0] === '.') return true; // 跳过 . 开头的文件
  if (path.extname(fileName) !== '.md') return true; // 跳过不是扩展不是 .md 的文件
  if (excludeFileNames.find(x => x === fileName)) return true; // 跳过 excludeFileNames 列表中的文件
  if (isFileContainIgnoreComment(itemFullPath)) return true; // 注释排除 "catalog ignore"
  return false
}

function isFileContainIgnoreComment(itemFullPath) {
  let fd = 0
  try {
    fd = fs.openSync(itemFullPath, 'r')
    const buffer = Buffer.alloc(100);
    fs.readSync(fd, buffer, 0, 100, 0)
    const firstLine = buffer.toString('utf8').split('\n')[0]
    // console.log('firstLine', firstLine);
    return firstLine.indexOf('catalog ignore') !== -1
  } finally {
    if (fd) fs.closeSync(fd)
  }
}

////////////////////////// utils //////////////////////////

function pathJoin(...paths) {
  return paths.join('/').replace(/\/+/g, '/')
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
      if (!shouldFileExcluded(itemFullPath)) {
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

function walk(rootPath, func) {
  const foldersAndFiles = fs.readdirSync(rootPath);
  for (let item of foldersAndFiles) {
    const itemFullPath = pathJoin(rootPath, item);
    const stat = fs.statSync(itemFullPath);
    if (stat.isDirectory()) {
      func(itemFullPath)
      walk(itemFullPath, func)
    } else {
      func(itemFullPath)
    }
  }
}

////////////////////////// 执行 //////////////////////////

walk('.', itemFullPath => {
  const stat = fs.statSync(itemFullPath);
  if (!stat.isDirectory()) return
  let p = path.join(itemFullPath, CATALOG_FILE_NAME)
  if (fs.existsSync(p)) {
    fs.unlinkSync(p)
  }
})

let treeResult = parseFolderTree('.')

if (!fs.existsSync('.temp')) fs.mkdirSync('.temp')
fs.writeFileSync('.temp/treeData.json', JSON.stringify(treeResult.treeData, null, 2));
fs.writeFileSync('.temp/folderList.json', JSON.stringify(treeResult.folderList, null, 2))
fs.writeFileSync('.temp/plainTextResult.txt', treeResult.plainTextResult)

// 在除了根路径的每个文件夹下创建目录
if (CATALOG_EACH_FOLDER) {
  const { folderList } = treeResult
  for (let folerNode of folderList) {
    if (folerNode.fileCnt && folerNode.folderFullPath !== '.') {
      catalogEachFolder(folerNode)
    }
  }
}

// 在根路径下创建目录
const catalogLines = getCatalogTotalLines(treeResult.treeData)
console.log(`generating: ${CATALOG_FILE_NAME}`);
fs.writeFileSync(CATALOG_FILE_NAME, catalogLines.join('\n'))
console.log('concat Readme');
concatReadme(catalogLines)

// 发布github pages时, 需要把文件移动到一个子文件夹
// 环境变量 process.env.CI 在 .github/workflows/ 下的 actions 配置中添加
if (process.env.CI) moveFileToDeployFolder()

console.log('done');
