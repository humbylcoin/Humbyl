const ABI = require('ethereumjs-abi')
const web3 = require('web3')


function transferExtra(to, amount, identity) {
    var abi = ABI.methodID('transfer', [ 'address', 'uint256' ]).toString('hex') +
        ABI.rawEncode([ 'address', 'uint256', 'uint256' ], [ to, amount, identity ]).toString('hex')
    return '0x' + abi
}

var to = '0x01', amount = '0x40', identity = '0x40'

var encoded = transferExtra(to, amount, identity)
console.log(encoded)

var decoded = ABI.rawEncode([ 'address', 'uint256', 'uint256' ], [ to, amount, identity ]).toString('hex')


decoded = ABI.rawDecode([ 'address', 'uint256', 'uint256' ], Buffer.from(decoded.slice(0, 192), 'hex'))

console.log(decoded[1].toString(16))