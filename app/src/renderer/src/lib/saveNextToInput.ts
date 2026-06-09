const KEY = 'convar:saveNextToInput'

export function getSaveNextToInput(): boolean {
  return sessionStorage.getItem(KEY) === '1'
}

export function setSaveNextToInput(value: boolean): void {
  sessionStorage.setItem(KEY, value ? '1' : '0')
}
