import { ethers } from 'ethers'
import IUniswapV3Factory from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json'
import IUniswapV3Pool from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'

export async function quotePair() {

    const uniswapV3FactoryAddress = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
    const { PRIVATE_KEY, BASE_URL } = process.env

    if (!PRIVATE_KEY) {
        console.log('Private key missing from env variables')
        return
    }
    
    // Connect to the BASE mainnet
    // const provider = ethers.getDefaultProvider();
    const provider = new ethers.providers.JsonRpcProvider(BASE_URL);

    // Sign the transaction with the contract owner's private key
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);    
    
    // Get the contract instance
    const factoryContract = new ethers.Contract(uniswapV3FactoryAddress, IUniswapV3Factory.abi, wallet)

    const walletAddress = await wallet.getAddress()
    const walletBalance = await wallet.getBalance()

    console.log(walletAddress + ':', walletBalance.toBigInt())

    const tokenAAddress = '0x91f45aa2bde7393e0af1cc674ffe75d746b93567' // WETH
    const tokenBAddress = '0x4200000000000000000000000000000000000006' // FRAME

    const txInputs = [
        tokenAAddress,
        tokenBAddress,
        3000
    ]

    const poolAddress = await factoryContract.getPool(...txInputs)
    console.log('Pool address:', poolAddress)

    const poolContract = new ethers.Contract(poolAddress, IUniswapV3Pool.abi, wallet)
    const slot0 = await poolContract.slot0()
    
    const { tick } = slot0
    // const tokenBPrice = 1 / ((1.0001 ** tick) * (10 ** -12))
    const tokenBPrice = 1 / ((1.0001 ** tick))
    
    console.log('Tick:', tick, 'Price:', tokenBPrice)

    return tokenBPrice

}

