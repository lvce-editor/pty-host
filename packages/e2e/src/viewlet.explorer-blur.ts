import type { Test } from '@lvce-editor/test-with-playwright'

export const name = 'viewlet.explorer-blur'

export const test: Test = async ({
  expect,
  Explorer,
  FileSystem,
  Locator,
  Workspace,
}) => {
  // arrange
  const tmpDir = await FileSystem.getTmpDir()
  await FileSystem.setFiles([
    { content: 'content 1', uri: `${tmpDir}/file1.txt` },
    { content: 'content 2', uri: `${tmpDir}/file2.txt` },
    { content: 'content 3', uri: `${tmpDir}/file3.txt` },
  ])
  await Workspace.setPath(tmpDir)
  await Explorer.selectIndices([0, 1])

  // act
  await Explorer.handleBlur()

  // assert
  const file1 = Locator('.TreeItem').nth(0)
  await expect(file1).toHaveClass('TreeItem')
  const file2 = Locator('.TreeItem').nth(1)
  await expect(file2).toHaveClass('TreeItem')
  const file3 = Locator('.TreeItem').nth(2)
  await expect(file3).toHaveClass('TreeItem')
}
