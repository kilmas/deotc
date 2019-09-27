const FIBOS = require("fibos.js");
const fs = require('fs');
const zip = require('zip');
const Config = {
	dev: {
		httpEndpoint: "http://127.0.0.1:8801"
	},
	testnet: {
		httpEndpoint: "http://testnet.fibos.fo:8870"
	},
	mainnet: {
		httpEndpoint: "http://to-rpc.fibos.io:8870"
	}
}

module.exports = (name, options) => {

	options = options || {};

	let env = options.env || "mainnet";
	let path = options.path || "./" + name + "_" + new Date().getTime();

	let config = Config[env];

	let fibos = FIBOS({
		httpEndpoint: config.httpEndpoint,
		logger: {
			log: null,
			error: null
		}
	});

	fs.mkdir(path);

	let abi = fibos.getAbiSync(name);
	fs.writeFile(path + "/abi.json", JSON.stringify(abi));

	let code = fibos.getRawCodeAndAbiSync(name);
	let zipfile = zip.open(Buffer.from(code.wasm, 'base64'));
	zipfile.extractAll(path)
}