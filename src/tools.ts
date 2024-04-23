import CryptoJS from 'crypto-js'

export const decrypt = (telegram_id: number, _secret: string, code: string): string => {
  const key = `KEYKEYKEY${telegram_id}_${_secret}`
  return CryptoJS.AES.decrypt(code, key).toString(CryptoJS.enc.Utf8)
}

export const encrypt = (telegram_id: number, _secret: string, txt: string): string => {
  const key = `KEYKEYKEY${telegram_id}_${_secret}`
  return CryptoJS.AES.encrypt(txt, key).toString()
}

console.log(encrypt(0, '', ''))
