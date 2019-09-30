const CONTRACT_NAME = 'fibosuserp2p';

const error_msg = [
  'no this id record',
  'USER NO TOKEN',
  'not your seller',
  'status error',
  'NEED FO',
  'arbitrate NEED MORE 1000000',
  'fuck you, blacklist',
  'sell number > buy number',
  'sell token = buy token',
  'rich NEED MORE 200000',
];

// 
function sendToken (from, to, quantity, memo) {
  trans.send_inline("eosio.token", "transfer", {
    from: from,
    to: to,
    quantity: quantity,
    memo: memo
  }, [{
    "actor": from,
    "permission": "active"
  }])
}

// 获取用户TOKEN
function getBalance (account, asset = 'FO', contract = 'eosio.token') {
  const accounts = db.accounts(contract, account);
  let itr =  accounts.begin();
  let bAsset;
  while (itr.data) {
    bAsset = itr.data.balance.quantity.split(' ');
    bAsset[0] = Number(bAsset[0])
    if (bAsset[1] === asset) {
      break;
    }
    itr = itr.next();
  }
  assert(itr.data, error_msg[1]);
  return bAsset;
}

function getPlayer (account) {
  const players = db.players(CONTRACT_NAME, CONTRACT_NAME);
  const player = players.find(account);
  return {
    players,
    player
  }
}

const record_indexes = {
  seller: [64, o => [o.seller]],
  buyer: [64, o => [o.buyer]],
};

function getRecord(id) {
  const records = db.records(CONTRACT_NAME, CONTRACT_NAME, record_indexes);
  const record = records.find(id);
  return {
    record,
    records,
  }
}

function getAccount() {
  let account = action.authorization[0].actor;
  action.require_auth(account);
  return account;
}

// 判断账号是否允许仲裁
function assert_arbitrate (account) {
  const prods = db.producers('eosio', 'eosio');
  const producer = prods.find(account);
  const balance = getBalance(account);
  assert((producer.data && Number(producer.data.total_votes) > getConfig(1)) || Number(balance[0]) > getConfig(9), 'need bp or richer');
}

function assert_userinfo (account) {
  const userinfos = db.userinfos(CONTRACT_NAME, account);
  let userinfo = userinfos.begin();
  assert(userinfo.data, '需要先设置支付信息');
}

function assert_sell_buy (sell, buy) {
  const sell_asset = sell.split(' ');
  const pay_asset = buy.split(' ');

  assert(Number(sell_asset[0]) >= Number(pay_asset[0]), error_msg[7]);
  assert(sell_asset[1] === pay_asset[1], error_msg[8]);
}

function assert_maintenance () {
  assert(getConfig(6) == 0, '系统维护中');
}

function assert_player_count (account) {
  const { player } = getPlayer(account);
  assert(player.data && player.data.cur_count - player.data.success_count < 2, '用户不能部署多个订单');
}


const global = db.global(CONTRACT_NAME, CONTRACT_NAME);
function getConfig(id) {
  const state = global.find(id);
  if (state.data) {
    return state.data.value
  }
  const default_config = [
    // 仲裁超过3个bp认准，最终胜诉
    arbitrater_count = 3,
    // 仲裁bp需要投票数
    bp_total_votes = 300000000000000000,
    // 大户的FO数量定义
    rich_limit = 20000,
    // 仲裁时间
    arbitrate_timeout = 3600 * 12 * 1000 * 1000,
    // 上诉时间
    appeal_timeout = 3600 * 12 * 1000 * 1000,
    // 每单限制，以毫钱为单位
    pay_limit = 20000000,
    // 系统维护中
    is_maintenance = 0,
    // 服务费用
    service_pay = 10000,
    // 抵押费用
    staking_pay = 10000000,
    // 限制每个用户布单数
    user_record_limit = 1,
  ]
  return default_config[id];
}

/**
* @param id
* @returns
*/
exports.config = (id, value) => {
  action.require_auth(CONTRACT_NAME);
  const global = db.global(CONTRACT_NAME, CONTRACT_NAME);
  const global_state = global.find(id);
  if (global_state.data) {
    global_state.data.value = value;
    global_state.update(CONTRACT_NAME);
  } else {
    global_state.emplace(CONTRACT_NAME, {
      "id": id,
      "value": value
    });
  }
}

/**
* @param table
* @param id
* @returns
*/
exports.deltable = (table, scope, id) => {
  action.require_auth(CONTRACT_NAME);
  assert(db[table], 'no this table');
  const tables = db[table](CONTRACT_NAME, scope);
  if (id) {
    const red = tables.find(id);
    assert(record.data, 'need have data');
    red.remove();
  } else {
    let itr = tables.begin();
    let i = 0, itr1;
    do {
      itr1 = itr.next();
      itr.remove();
      itr = itr1;
      i ++;
    } while (i < 30 && itr.data);
  }
}

function update_record_id (account, id) {
  const { player } = getPlayer(account);
  if (player.data) {
    player.data.cur_count++;
    player.data.record_id = id;
    player.update(CONTRACT_NAME);
  } 
}

const arbitrate_indexes = {
  record: [64, o => [o.record_id]],
  account: [64, o => [o.account]],
};

function delarbs (id) {
  const arbitration = db.arbitration(CONTRACT_NAME, CONTRACT_NAME, arbitrate_indexes);
  let upper_itr = arbitration.indexes.record.find({record_id:id});
  let next_itr;
  while (upper_itr.data) {
    next_itr = upper_itr.next();
    upper_itr.remove();
    upper_itr = next_itr;
  }
}

/**
* @param account
* @param user
* @param amount
* @param memo
* @returns
*/
exports.on_transfer = (account, user, amount, memo) => {
  if (account === CONTRACT_NAME || user !== CONTRACT_NAME) {
    return;
  }

  const amount_asset =  amount.split(' ');
  const params = memo.split(',');
  const act = params[0];
  const cur_time = action.publication_time;

  assert_userinfo(account);
  assert_player_count(account);
  // status 1:挂卖单,2:锁定订单,3:申请仲裁,4:仲裁中,5:上诉仲裁中
  // act 1:卖家增加卖单 2:买家增加买单 3:进场单 4; 用户卖币锁定到指定id买单
  if (act === '1') {
    // price：单价, pay_type：收款设置
    const price = Number(params[1]), pay_type = Number(params[2]);
    const records = db.records(CONTRACT_NAME, CONTRACT_NAME, record_indexes);

    // 不限制了
    // assert(Number(amount_asset[0]) * price <= getConfig(5), '每单超过限额');

    const id = records.get_primary_key();
    // 用户增加卖单
    const record = {
      id: id,
      seller: account,
      buyer: '',
      dateline: cur_time,
      pay: amount,
      buy_pay: amount,
      status: 1,
      price: price,
      type: 1,
      pay_type
    };
    records.emplace(CONTRACT_NAME, record);
    update_record_id(account, id);
  } else if(act === '2') {
    // 用户下买单
    // price：单价, ref：推荐人
    const price = Number(params[1]), buy_amount = params[2], pay_type = Number(params[3]);
    assert(Number(amount_asset[0]) == getConfig(7) / 10000, '1.0000 FO 服务费');
    const records = db.records(CONTRACT_NAME, CONTRACT_NAME, record_indexes);
    const id = records.get_primary_key();
    // 用户增加卖单,amount仅为下买单服务费
    const record = {
      id: id,
      seller: CONTRACT_NAME,
      buyer: account,
      dateline: cur_time,
      pay: amount,
      buy_pay: buy_amount,
      status: 1,
      price: price,
      type: 2,
      pay_type: pay_type,// 暂未设置
    }
    records.emplace(CONTRACT_NAME, record);
    update_record_id(account, id);
  } else if (act === '3') {
    // price：单价, pay_type
    const price = Number(params[1]), pay_type = Number(params[2]);
    const balance = getBalance(account);
    assert(balance, error_msg[4]);
    // 大户大于一定FO数量才能做小额无仲裁商家，无仲裁商家需要
    assert(balance[0] >= getConfig(2), error_msg[5]);
    assert(balance[1] === 'FO', '进场单只接受FO');

    assert(Number(amount_asset[0]) == getConfig(8) / 10000, '1000.0000 FO 抵押费用');
    const records = db.records(CONTRACT_NAME, CONTRACT_NAME, record_indexes);
    const id = records.get_primary_key();
    // 用户增加卖单
    const record = {
      id: id,
      seller: account,
      buyer: CONTRACT_NAME,
      dateline: cur_time,
      pay: amount,
      buy_pay: amount,
      status: 1,
      price: price,
      type: 3,
      pay_type
    };

    records.emplace(CONTRACT_NAME, record);
    // 更新用户信息
    update_record_id(account, id);
  } else if (act === '4') {
    // 卖方用户卖TOKEN到指定id买单
    // id：用户订单,pay_type: 联系支付设置
    const id = Number(params[1]), pay_type = Number(params[2]);

    // assert(Number(amount_asset[0]) == getConfig(7) / 10000, '1.0000 FO 服务费');
    const records = db.records(CONTRACT_NAME, CONTRACT_NAME, record_indexes);
    const record = records.find(id);
    assert(record.data, error_msg[0]);
    assert(record.data.type == 2, '需为用户买单');
    assert(record.data.status == 1, '未锁定订单');

    assert_sell_buy(amount, record.data.buy_pay);

    // 锁定订单
    record.data.status = 2;
    record.data.seller = account;
    record.data.pay = amount;
    record.data.dateline = cur_time;
    if (pay_type>-1) {
      record.data.pay_type = pay_type;
    }

    record.update(CONTRACT_NAME);
    // 更新用户信息
    update_record_id(account, id);
  }
}


/**
 * @param id 信息类型...
 * @param acct 账号
 * @param ref 推荐人
 * 用户增加信息
 */
exports.setinfo = (id, acct, ref) => {
  const account = getAccount();
  const userinfos = db.userinfos(CONTRACT_NAME, account);
  const upper_itr = userinfos.find(id);

  if (upper_itr.data) {
    upper_itr.data.acct = acct;
    upper_itr.update(account);
  } else {
    userinfos.emplace(account, {
      id: id,
      acct: acct
    });
  }
  const { player, players } = getPlayer(account);
  if (!player.data) {
    if (ref) {
      action.is_account(ref);
    }
    const data = {
      "id": account,
      "record_id": -1,
      "success_count": 0,
      "arbitrate_count": 0,
      "cur_count": 0,
      "ref": ref
    };
    players.emplace(CONTRACT_NAME, data);
  }
}

/**
 * @param id 订单id
 * @param pay 买多少
 * 用户买，锁定订单
 */
exports.buy = (id, pay) => {
  const account = getAccount();
  const { record } = getRecord(id);
  assert(record.data, error_msg[0]);
  assert(record.data.type == 1, '常规订单,用户才能链上购买');
  assert(record.data.status == 1, error_msg[1]);

  assert_sell_buy(record.data.pay, pay);

  // 更新用户信息
  const { player, players } = getPlayer(account);
  if (player.data) {
    player.data.cur_count++;
    player.update(CONTRACT_NAME);
  } else {
    const data = {
      "id": account,
      "record_id": id,
      "success_count": 0,
      "arbitrate_count": 0,
      "cur_count": 1,
      "ref": ""
    };
    players.emplace(CONTRACT_NAME, data);
  }
  assert_player_count(account);

  const balance = getBalance(account);

  assert(balance[1] === 'FO', '只接受FO');
  assert(balance[0] > 100, '请先进场,账号需要大于100FO');

  // 锁定
  record.data.status = 2;
  record.data.buy_pay = pay;
  record.data.buyer = account;
  record.update(CONTRACT_NAME);
}

/**
 * @param id 订单id
 * @param pay 更改价格
 * 更新订单价格
 */
exports.updateorder = (id, price) => {
  const account = getAccount();
  const { record } = getRecord(id);
  assert(record.data, error_msg[0]);
  assert(record.data.status == 1, error_msg[1]);
  if (record.data.type == 1 || record.data.type == 3){
    assert(record.data.seller === account, '本人订单');
  } else if (record.data.type == 2) {
    assert(record.data.buyer === account, '本人订单');
  } else {
    assert(false, '订单错误');
  }
  // 锁定
  record.data.price = price;
  record.update(CONTRACT_NAME);
}


function _after_cur_count (account) {
  const { player } = getPlayer(account);
  if (player.data) {
    // 当前参与数
    player.data.cur_count--;
    player.update(CONTRACT_NAME);
  }
}

/**
 * @param id 订单id
 * 卖家/买家取消订单
 */
exports.cancelorder = (id) => {
  const account = getAccount();
  const { record } = getRecord(id);
  assert(record.data, error_msg[0]);
  if (record.data.seller === account) {
    // 卖家订单未锁定状态才能取消订单
    assert(record.data.status == 1, error_msg[1]);
    let pay = record.data.pay;
    // 进场收取服务费
    if (record.data.type == 3) {
      const pay_asset = record.data.pay.split(' ');
      const pay_length = pay_asset[0].split('.')[1].length;
      pay =(Number(pay_asset[0]) - getConfig(6) / 10000).toFixed(pay_length) + ' ' + pay_asset[1];
    }
    // 需要减少cur_count todo
    _after_cur_count(account);
    sendToken(CONTRACT_NAME, account, pay, '退回订单pay');
    record.remove();
  } else if (record.data.buyer === account) {
    // 买家订单在锁定状态，取消订单
    if (record.data.type == 1) {
      // 买家只要确认该单没问题，无论是仲裁期间还是
      assert(record.data.status >= 2, error_msg[1]);
      // 需要减少cur_count todo
      _after_cur_count(account);
      record.data.status = 1;
      record.data.buyer = '';
      record.update(CONTRACT_NAME);
    } else if (record.data.type == 2) {
      assert(record.data.status == 1, error_msg[1]);
      _after_cur_count(account);
      record.remove();
    } else {
      assert(false, '其它订单不能取消');
    }
  } else {
    assert(false, '非卖家/买家不能取消订单');
  }
  // 删除改id所有仲裁记录
  delarbs(id);
}


/**
 * @param id
 * 卖家确认订单成功
 */
exports.result = (id) => {
  const account = getAccount();
  const { record } = getRecord(id);
  assert(record.data, error_msg[0]);
  assert(record.data.seller === account, error_msg[2]);
  // 卖家可以在锁定/仲裁/上诉期间确定订单
  assert(record.data.status >= 2, error_msg[3]);

  const transfer_amount = record.data.buy_pay;
  const pay_asset = record.data.pay.split(' ');
  const pay_length = pay_asset[0].split('.')[1].length;
  const buy_pay_asset = record.data.buy_pay.split(' ');
  assert(pay_asset[1] === buy_pay_asset[1], 'buy === sell asset!');
  const remain_pay = Number(pay_asset[0]) - Number(buy_pay_asset[0]);

  // 卖家确认
  const players = db.players(CONTRACT_NAME, CONTRACT_NAME);
  const buyer = players.find(record.data.buyer);
  if (buyer.data) {
    buyer.data.cur_count--;
    buyer.update(CONTRACT_NAME);
  }

  // 发送
  sendToken(CONTRACT_NAME, record.data.buyer, transfer_amount, 'pay success');
  // 暂时用不到这个，现在每单都需要全额购买
  if (remain_pay > 0) {
    // 剩余继续
    record.data.pay = remain_pay.toFixed(pay_length) + ' ' + pay_asset[1]; 
    record.data.buyer = '';
    record.data.status = 1;
    record.update(CONTRACT_NAME);
  } else {
    record.remove();
  }

  const player = players.find(account);
  if (player.data) {
    player.data.success_count++;
    player.update(CONTRACT_NAME);
  }
  // 删除改id所有仲裁记录
  delarbs(id);
};

// 申请仲裁
exports.applyarb = (id) => {
  const account = getAccount();
  // 申请仲裁需要设置用户信息
  // assert_userinfo(account);
  const { record } = getRecord(id);
  assert(record.data, error_msg[0]);
  assert(account === record.data.seller || account === record.data.buyer, '需要买家或卖家');
  assert(parseInt(record.data.dateline) + parseInt(getConfig(3)) < action.publication_time, '需要一天，双方没有和解才能，才能申请仲裁');
  // 申请仲裁
  record.data.status = 3;
  record.data.dateline = action.publication_time;
  record.update(CONTRACT_NAME);
}

/**
 * @param id
 * @param win 1:卖家胜诉，2：买家胜诉
 * @param memo 胜诉备注
 * 单个bp调解胜诉
 * 卖家或买家不服可上诉，
 * 进入申述状态，只需要三个bp确认胜诉方，卖家可解锁订单或买家即可提现
 */
exports.arbitrate = (id, win, memo) => {
  const account = getAccount();

  const blacklist = db.blacklist(CONTRACT_NAME, CONTRACT_NAME);
  const fuck_arbitrater = blacklist.find(account);
  // 禁止仲裁员黑名单
  assert(!fuck_arbitrater.data, error_msg[6]);

  assert(win == 1 || win == 2, error_msg[5]);

  const { record } = getRecord(id);
  assert(record.data, error_msg[0]);
  // assert(parseInt(record.data.dateline) + parseInt(getConfig(3)) < action.publication_time, '需要限定时间内，双方仍没有和解才能，仲裁员调查介入仲裁');

  // bp 仲裁
  assert_arbitrate(account);

  const arbitration = db.arbitration(CONTRACT_NAME, CONTRACT_NAME, arbitrate_indexes);
  const cur_time = action.publication_time;
  let upper_itr = arbitration.indexes.record.find({record_id:id});
  let count = 0;
  while (upper_itr.data) {
    assert(upper_itr.data.account !== account, "该账号，已仲裁");
    count++;
    upper_itr = upper_itr.next();
  }
  if (count > 0) {
    assert(record.data.status == 5, "当一个仲裁人裁决后, 如上诉，在有仲裁人加入时，订单状态必须为上诉仲裁中");
  }
  // 如果是上诉中，则不需要设置仲裁中
  if (record.data.status == 3) {
    record.data.status = 4;
  }
  record.update(CONTRACT_NAME);
  arbitration.emplace(CONTRACT_NAME, {
    id: arbitration.get_primary_key(),
    record_id: id,
    account: account,
    dateline: cur_time,
    win: win,
    memo: memo
  });
}

// 上诉
exports.appeal = (id) => {
  const account = getAccount();
  const { record } = getRecord(id);
  assert(record.data, error_msg[0]);
  assert(account === record.data.seller || account === record.data.buyer, '需要买家或卖家');
  assert(record.data.status == 4, error_msg[3]);
  record.data.status = 5;
  record.data.dateline = action.publication_time;
  record.update(CONTRACT_NAME);
}

// 胜诉提现
exports.withdraw = (id) => {
  const account = getAccount();
  const { record } = getRecord(id);
  assert(record.data, error_msg[0]);
  assert(account === record.data.seller || account === record.data.buyer, '需要买家或卖家');

  const arbitration = db.arbitration(CONTRACT_NAME, CONTRACT_NAME, arbitrate_indexes);
  let upper_itr = arbitration.indexes.record.find({record_id:id});

  const cur_time = action.publication_time;
  if (record.data.status == 4) {
    // 仲裁和解
    assert(parseInt(record.data.dateline) + parseInt(getConfig(4)) < cur_time, '仲裁后,规定时间没有上诉，买家即可提现');
    if (upper_itr.data) {
      if (upper_itr.data.win == 1) {
        // 卖家仲裁自动获胜,解除锁定
        // 卖家减少1
        _after_cur_count(record.data.buyer);
        record.data.status = 1;
        record.data.buyer = '';
        record.update(CONTRACT_NAME);
      } else if (upper_itr.data.win == 2) {
        // 买家仲裁
        const players = db.players(CONTRACT_NAME, CONTRACT_NAME);
        const buyer = players.find(record.data.buyer);
        if (buyer.data) {
          buyer.data.cur_count--;
          buyer.update(CONTRACT_NAME);
        }
        const seller = players.find(record.data.seller);
        if (seller.data) {
          seller.data.cur_count--;
          seller.update(CONTRACT_NAME);
        }
        sendToken(CONTRACT_NAME, record.data.buyer, record.data.buy_pay, 'arbitrate success');
        record.remove();
      }
      upper_itr.remove();
    }
    return;
  }
  assert(record.data.status == 5, '必须为上诉后');
  assert(parseInt(record.data.dateline) + parseInt(getConfig(4)) < cur_time, '仲裁后，或者上诉后');

  // 上诉后需要找限定bp数，裁定
  let seller_win = 0;
  let buyer_win = 0;
  let next_itr = upper_itr;
  while (next_itr.data && next_itr.data.record_id === id) {
    if (next_itr.data.win == 1) {
      seller_win ++;
    } else {
      buyer_win ++;
    }
    next_itr = next_itr.next();
  }

  // 需要的仲裁数量
  const _arbitrater_count = getConfig(0);
  if (seller_win > buyer_win && seller_win >= _arbitrater_count) {
    // 胜诉解除锁定
    const players = db.players(CONTRACT_NAME, CONTRACT_NAME);
    // 买单当前记录减一
    const buyer = players.find(record.data.buyer);
    if (buyer.data) {
      // 当前参与数
      buyer.data.cur_count--;
      // 仲裁数加一
      buyer.data.arbitrate_count++;
      buyer.update(CONTRACT_NAME);
    }
    // 卖家胜诉,解除锁定
    record.data.status = 1;
    record.data.buyer = '';
    record.update(CONTRACT_NAME);

    const seller = players.find(record.data.seller);
    if (seller.data) {
      // 当前参与数
      // seller.data.success_count++;
      // 仲裁数加一
      seller.data.arbitrate_count++;
      seller.update(CONTRACT_NAME);
    }
  } else if (buyer_win > seller_win && buyer_win >= _arbitrater_count) {
    // 买家胜诉
    const players = db.players(CONTRACT_NAME, CONTRACT_NAME);
    const buyer = players.find(record.data.buyer);
    if (buyer.data) {
      // 成功++
      buyer.data.success_count++;
      // 仲裁数加一
      buyer.data.arbitrate_count++;
      buyer.update(CONTRACT_NAME);
    }
    const seller = players.find(record.data.seller);
    if (seller.data) {
      // 仲裁数加一
      seller.data.cur_count--;
      seller.data.arbitrate_count++;
      seller.update(CONTRACT_NAME);
    }

    sendToken(CONTRACT_NAME, record.data.buyer, record.data.buy_pay, 'appeal success');
    // 删除订单作为惩罚
    record.remove();
  } else {
    assert(false, '还不能提现');
  }
  while (upper_itr.data) {
    next_itr = upper_itr.next();
    upper_itr.remove();
    upper_itr = next_itr;
  }
}

/**
 * @param type 1:微信群二维码...
 * @param acct 账号
 * @param ref 推荐人
 * 设置参与仲裁群
 */
exports.setgroup = (acct) => {
  const account = getAccount();
  assert_arbitrate(account);
  const groups = db.arbgroups(CONTRACT_NAME, CONTRACT_NAME);
  const arbgroup = groups.find(account);

  if (arbgroup.data) {
    arbgroup.data.acct = acct;
    arbgroup.update(account);
  } else {
    groups.emplace(CONTRACT_NAME, {
      account,
      acct: acct
    });
  }
}

