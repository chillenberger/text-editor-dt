import { flattenDir, expandDir, findDir, deleteFileFromDir, createFileInDir, readFileInDir, alphabetizeDir } from "@renderer/lib/file";
import {describe, expect, test} from '@jest/globals';
import {Dir, File} from '@/types/index';

describe('test flattenDir', () => {
  test('make a db from file system', () => {
    const db = flattenDir(TestDir);
    expect(db).toEqual(TestDB);
  })
})

describe('test expandDir', () => {
  test('make a dir from db', () => {
    const dir = expandDir(TestDB);
    expect(dir).toEqual(TestDir);
  })
})

describe('findDir', () => {
  test('find existing dir', () => {
    const dir = findDir('root/subdir1/subsubdir1', TestDir);
    expect(dir).toEqual({
      title: 'subsubdir1',
      children: [
        { title: 'file3.txt', content: 'This is file 3' }
      ]
    });
  });

  test('return null for non-existing dir', () => {
    const dir = findDir('root/subdir1/nonexistent', TestDir);
    expect(dir).toBeNull();
  });

  test('return null when path points to a file', () => {
    const dir = findDir('root/subdir1/file2.txt', TestDir);
    expect(dir).toBeNull();
  });

  test('find root', () => {
    const dir = findDir('root', TestDir);
    expect(dir).toBe(TestDir)
  })

  test('return root dir for empty path', () => {
    const dir = findDir('', TestDir);
    expect(dir).toEqual(null);
  });
});

describe('readFileInDir', () => {
  test('get existing file', () => {
    const filePath = 'root/subdir1/subsubdir1/file3.txt';
    const file = readFileInDir(filePath, TestDir);
    expect(file).toEqual({ path: filePath, content: 'This is file 3' });
  });
});

describe('deleteFileFromDir', () => {
  test('delete existing file', () => {
    const dirCopy: Dir = JSON.parse(JSON.stringify(TestDir));
    let targetFile = flattenDir(TestDir)[3];

    let file = readFileInDir(targetFile.path, dirCopy);
    expect(file).toEqual(targetFile);

    deleteFileFromDir(targetFile.path, dirCopy);
    file = readFileInDir(targetFile.path, dirCopy);
    expect(file).toBeNull();
  });
});

describe('createFileInDir', () => {
  test('add file', () => {
    const dirCopy: Dir = JSON.parse(JSON.stringify(TestDir));
    let file = {path: 'root/subdir1/subsubdir2/add-file.txt', content: "new file content"};
    createFileInDir(file, dirCopy);
    let foundDoc = readFileInDir(file.path, dirCopy);
    expect(file.content).toEqual(foundDoc?.content);
  })
})

describe('alphabetizeDir', () => {
  test('alphabetize directory', () => {
    const dirCopy: Dir = JSON.parse(JSON.stringify(TestDir));
    alphabetizeDir(dirCopy);
    expect(dirCopy.children[1].title).toBe('subdir1');
    expect(dirCopy.children[2].title).toBe('subdir2');
  });
});

const TestDir: Dir = { title: 'root', children: [
  { title: 'file1.txt', content: 'This is file 1' },
  { title: 'subdir1', children: [
    { title: 'file2.txt', content: 'This is file 2' },
    { title: 'subsubdir1', children: [
      { title: 'file3.txt', content: 'This is file 3' }
    ]}
  ]},
  { title: 'subdir2', children: [
    { title: 'file4.txt', content: 'This is file 4' }
  ] }
]};

const TestDB: File[] = [
  {
    content: 'This is file 1',
    path: 'root/file1.txt'
  },
  {
    content: 'This is file 2',
    path: 'root/subdir1/file2.txt'
  },
  {
    content: 'This is file 3',
    path: 'root/subdir1/subsubdir1/file3.txt'
  },
  {
    content: 'This is file 4',
    path: 'root/subdir2/file4.txt'
  }
];