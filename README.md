# Limit Order Protocol UniswapV3 LP
Provides liquidity to Uniswap V3 for tokens bought with 1inch Limit Order Protocol in one transaction.

1inch Limit Order Protocol is a set of smart contracts. Maker submits limit order with callback function information added. via 1inch API. When you reach the price you specified, the taker should execute your limit order. When the order is executed, your purchased token will be transferred to the specified contract, and the callback function will be called.   
The Contract then deposits the token to UniswapV3 pool,and transfer its position to the specified receipient.

## About 1inch Limit Order Protocol
Key features of the protocol is extreme flexibility and high gas efficiency that achieved by using two different order types - regular Limit Order and RFQ Order.

### Limit Order
1inch Limit Order Protocol provides extremely flexible limit order, can be configured with:

 1. Order execution predicate.
 2. Helper function for asset price evaluation.
 3. Callback, for to notify maker on order execution.

## Getting Started 
### Installing
To install dependencies, run

`yarn`

### Complipe
`yarn compile`

### Deployment
To depoly on the hardhat network, run

`yarn deploy`

### Test
`yarn test`

Or

`yarn hardhat test FILE --deploy-fixture`

## Link
[1inch dApp](https://app.1inch.io/#/1/classic/limit-order/WETH/DAI)

[1inch Limit Order Protocol Doc](https://docs.1inch.io/limit-order-protocol/)

[1inch Limit Order Protocol Utils Doc](https://docs.1inch.io/limit-order-protocol-utils/)

[GitHub: Limit Ordr Protocol](https://github.com/1inch/limit-order-protocol/)

[GitHub: Limit Ordr Protocol Utils](https://github.com/1inch/limit-order-protocol-utils/)
