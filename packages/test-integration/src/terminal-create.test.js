const id = 0

export const test = async (rpc) => {
  await rpc.invoke('Editor.create', {
    id,
    content: 'abc',
    fontFamily: '',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 400,
    letterSpacing: 0.5,
    tabSize: 2,
    width: 100,
    isMonospaceFont: true,
    charWidth: 9,
  })
}
