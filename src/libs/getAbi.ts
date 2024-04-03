import axios from 'axios'
import {
    BASESCAN_API_KEY, BASESCAN_API_URL
} from '../libs/constants'

export const getAbi = async (address: string) => {
    const url = `${BASESCAN_API_URL}?module=contract&action=getabi&address=${address}&apikey=${BASESCAN_API_KEY}`
    const res = await axios.get(url)
    const abi = JSON.parse(res.data.result)
    return abi
  }