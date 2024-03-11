import { renameFile, removeFile } from '../util'
import { describe, it, beforeAll, afterAll } from '@jest/globals'
import fsP from 'fs/promises'
import path from 'path'

const tempPath = path.join(__dirname, '__tmp__')

beforeAll(async () => {
  await fsP.mkdir(tempPath)
})

afterAll(async () => {
  await fsP.rmdir(tempPath, { recursive: true })
})

describe('util', () => {
  it('should rename file', async () => {
    const tmpFilePath = path.join(tempPath, 'rename.tmp')
    const filePath = path.join(tempPath, 'rename.txt')
    await fsP.writeFile(tmpFilePath, 'test rename')
    await renameFile(tmpFilePath, filePath)
  })

  it('should remove file', async () => {
    const tmpFilePath = path.join(tempPath, 'remove.tmp')
    await fsP.writeFile(tmpFilePath, 'test rename')
    await removeFile(tmpFilePath)
  })

  // it('remove file should throw', (done) => {
  //   removeFile(path.join(tempPath, 'file-not-exist.tmp'))
  //     .then(() => {
  //       done()
  //     })
  //     .catch((err) => {
  //       expect(err.code).toBe('ENOENT')
  //       done()
  //     })
  // }, 60000)
})
