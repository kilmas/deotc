var FIBOS = require('fibos.js');
const fs = require('fs');
const path = require('path');
var config_data = require('./config.js');

var config = config_data.test
if (process.argv[2]) {
  if (process.argv[2] === 'prod') {
    config = config_data.prod
  } else if(process.argv[2] === 'test') {
    config = config_data.test
  }
}
// 创建合约账户
var name = config.contract;

var pubkey = config.publicKey;

fibos = FIBOS({
  chainId: config.chainId,
  keyProvider: config.privatekey,
  httpEndpoint: config.httpEndpoint,
  logger: {
    log: null,
    error: null
  }
});

// 发布一个合约

var dir = 'src'
var log = null
// 部署abi
var abi = JSON.parse(fs.readTextFile(path.join(dir, 'abi.json')));
log = fibos.setabiSync(name, abi);
console.log(log);

// 部署代码
const js_code = fs.readTextFile(path.join(dir, 'index.js'));
log = fibos.setcodeSync(name, 0, 0, fibos.compileCode(js_code));
console.log(log);

// 把 合约的 权限赋予给 "eosio.code",让合约代码拥有转账的权限
log = fibos.updateauthSync({
  account: name,
  permission: "active",
  parent: 'owner',
  auth: {
    threshold: 1,
    keys: [{
      key: pubkey, // 你的公钥
      weight: 1
    }],
    "accounts": [{
      "permission": {
        "actor": name,
        "permission": "eosio.code"
      },
      "weight": 1
    }]
  }
}, {
  authorization: name
});
console.log(log)