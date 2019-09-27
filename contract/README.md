# extract Smart Contract

合约名称为: fibosuserp2p, 可以自行导出合约

## Install

$`curl -s https://fibos.io/download/installer.sh | sh`

$`$fibos --install`

## Extract

```
let extract = require("./extract");

extract("fibosuserp2p", {
	env: "mainnet",
	path: "./dapppath"
});
```

`fibos ...`

## Deploy

testNet

`fibos deploy.js test`

prod

`fibos deploy.js prod`