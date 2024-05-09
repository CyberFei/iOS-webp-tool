const { log } = require('console');
const fsPromise = require('fs/promises');
const { exec } = require('child_process');

const P = './images/';
const TEMP = '_';
const P_TEMP = `./${TEMP}/`;
const OUT = 'images_out';
const P_OUT = `./${OUT}/`;

// 延迟
const delay = (t = 1) =>
  new Promise((resolve) => setTimeout(resolve, t * 1000));

// 批量重命名
async function rename(path, files) {
  const promiseList = [];

  for (let name of files) {
    const newName = name.split('_').pop();
    promiseList.push(fsPromise.rename(path + name, path + newName));
  }

  return Promise.all(promiseList);
}

// 批量格式转换
async function format(path, files) {
  // 单个转换
  const doFormat = (name) =>
    new Promise((resolve, reject) => {
      const newName = name.split('.')[0] + '.webp';
      const cmdCommand = 'cwebp -q 90 ' + path + name + ' -o ' + path + newName;

      exec(cmdCommand, (error, stdout, stderr) => {
        if (error) {
          reject('文件转换执行错误');
          return;
        }

        resolve();
      });
    });

  const promiseList = [];
  for (let name of files) {
    promiseList.push(doFormat(name));
  }

  return promiseList;
}

// 合成
async function toOne(path, files, one) {
  console.log(files.length);
  let cmdCommand = 'webpmux';
  for (let name of files) {
    cmdCommand += ' -frame ' + path + name + ' +40+0+0+1-b';
  }
  cmdCommand += ` -loop 0 -o ${P_OUT + one}.webp`;

  return new Promise((resolve, reject) => {
    exec(cmdCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

// 构建 webp
async function build(folder) {
  const path = P_TEMP + folder + '/';

  log(folder + ' 批量重命名 开始');
  const images = await fsPromise.readdir(path);
  await rename(path, images);
  log(folder + ' 批量重命名 完成');
  await delay();

  log(folder + ' 批量格式转换 开始');
  const images_rename = await fsPromise.readdir(path);
  await format(path, images_rename);
  log(folder + ' 批量格式转换 完成');
  await delay();

  log(folder + ' 合并 开始');
  const images_rename_format = await fsPromise.readdir(path);
  await fsPromise.mkdir(OUT, { recursive: true });
  await toOne(
    path,
    images_rename_format.filter((item) => item.indexOf('.webp') > -1),
    folder,
  );
  log(folder + ' 合并 完成');
  await delay();
}

// 批量构建 webp
async function buildList() {
  // 获取文件夹列表
  const folders = await fsPromise.readdir(P);

  // 重建临时文件夹
  await fsPromise.rm(P_TEMP, { force: true, recursive: true });
  await fsPromise.cp(P, P_TEMP, { recursive: true });

  const promiseList = [];
  for (folder of folders) {
    promiseList.push(build(folder));
  }

  await Promise.all(promiseList);
  await delay();

  await fsPromise.rm(P_TEMP, { force: true, recursive: true });
  await delay();

  log('all done!!!');
  await delay();
}

buildList();
