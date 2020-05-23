<template>
  <div>
    <b-navbar toggleable="md">
      <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
      <b-navbar-brand href="#">BLOCKCHAIN OTC</b-navbar-brand>
      <b-navbar-brand>
        <span class="fa fa-share" v-clipboard:copy="copyData" v-clipboard:success="onCopy" v-clipboard:error="onError">
        </span></b-navbar-brand>
      <b-collapse is-nav id="nav_collapse">
        <b-navbar-nav>
          <b-nav-item @click.prevent="showRule">Rule</b-nav-item>
        </b-navbar-nav>
        <b-navbar-nav class="ml-auto">
          <b-nav-item-dropdown text="Lang" right>
            <b-dropdown-item href="#">EN</b-dropdown-item>
            <b-dropdown-item href="#">CN</b-dropdown-item>
          </b-nav-item-dropdown>
          <b-nav-form v-if="!account.name">
            <b-button size="sm" class="my-2 my-sm-0" @click="login">Login</b-button>
          </b-nav-form>
          <b-nav-form v-if="account.name">
            <b-button size="sm" class="my-2 my-sm-0 mr-2" @click="showTemp = 2;">收款信息</b-button>
            <b-button size="sm" class="my-2 my-sm-0" @click="showTemp = 4;">仲裁信息</b-button>
          </b-nav-form>
          <b-nav-item-dropdown right v-if="account.name">
            <!-- Using button-content slot -->
            <template slot="button-content">
              <em>{{account.name ? (account.name) : ''}}</em>
            </template>
            <b-dropdown-item @click.prevent="signout">Signout</b-dropdown-item>
          </b-nav-item-dropdown>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <main class="column">
      <template v-if="showTemp === 1">
        <div class="flex-row-center">
          <b-dropdown id="dropdown-left" :text="actionText||我要买" variant="primary" class="ml-1 text-left">
            <b-dropdown-item href="#" @click.prevent="actionText ='我要买';showTab=1;orderType=1;" v-if="myFO>100">我要买</b-dropdown-item>
            <b-dropdown-item href="#" @click.prevent="showTab=1;actionText ='我要卖';orderType=2;" v-if="myFO>100">我要卖</b-dropdown-item>
            <b-dropdown-item href="#" @click.prevent="showTab=1;actionText ='小额进场';orderType=3;">小额进场</b-dropdown-item>
            <b-dropdown-item href="#" @click.prevent="orderType=0; showTemp = 3;" v-if="myFO>100">挂单</b-dropdown-item>
          </b-dropdown>
          <div>
            <b-dropdown id="dropdown-left" right :text="showToken" class="m-1 small" variant="outline-primary">
              <b-dropdown-item href="#" @click.prevent="showToken=item.balance.quantity;" v-for="(item, index) in myBalance" :key="index">{{item.balance.quantity}}</b-dropdown-item>
            </b-dropdown>
            <b-dropdown id="dropdown-left" right :text="'...'">
              <b-dropdown-item href="#" @click.prevent="myOrders">我的订单</b-dropdown-item>
              <b-dropdown-item href="#" @click.prevent="findArb">寻找仲裁</b-dropdown-item>
              <b-dropdown-item href="#" @click.prevent="showTab=2;tabIndex2=3;getArbs();" v-if="myFO>100000||arbAcct">参与仲裁</b-dropdown-item>
            </b-dropdown>
          </div>
        </div>
        <div v-if="orderType===3 && showTab!==2">
          <b-button v-b-tooltip.hover.left="'查看商家收款设置，联系沟通，商家将为你提供当前市价小额FO进场!'" variant="primary" class="m-2">免责提示！</b-button>
          <b-list-group>
            <b-list-group-item v-for="(item, index) in tokenItems3" :key="index">
              <div class="w-100">
                <div class="flex-row-center">
                  <div class="medium-text">{{item.seller}}</div>
                  <div class="small-text">{{players[item.seller] && players[item.seller].success_count ? players[item.seller].success_count: 0 }} |
                    {{players[item.seller] && players[item.seller].success_count ? ((players[item.seller].success_count - players[item.seller].arbitrate_count) * 100 /players[item.seller].success_count).toFixed(2): 0 }}%
                  </div>
                </div>
              <div class="flex-row-center order-text">
                <div>
                  <div>数量 ~ {{tokenPrice['FO'] ? Number(10 / tokenPrice['FO'].sell).toFixed(4) : 100}} FO</div>
                  <div>限额 ￥10.00</div>
                </div>
                <div>
                  <div>单价</div>
                  <div>￥{{tokenPrice['FO'] ?tokenPrice['FO'].sell: '' }}</div>
                </div>
              </div>
              <div class="flex-row-center">
                <img :src="payIcons[item.pay_type]" class="pay-icon" />
                <template v-if="acctInfos[item.seller]&&acctInfos[item.seller][item.pay_type]">
                  <div v-if="item.pay_type < 10">
                    <b-button :id="`tooltip-target-${item.id}`">
                      {{accountTypes[acctInfos[item.seller][item.pay_type].id].text}}
                    </b-button>
                    <b-tooltip :target="`tooltip-target-${item.id}`" triggers="hover" placement="left" variant="danger">
                      <div style="background-color: #fff;margin:1px">
                        <qriously :value="acctDecode(acctInfos[qrAccount(item)][item.pay_type].acct)" :size="150" v-if="acctInfos[qrAccount(item)] && acctInfos[qrAccount(item)][item.pay_type]"/>
                      </div>
                    </b-tooltip>
                  </div>
                </template>
                <b-button variant="primary" @click="getAcctInfo(item.seller)" v-if="!acctInfos[item.seller]">
                  查看卖家信息
                </b-button>
              </div>
              </div>
            </b-list-group-item>
          </b-list-group>
        </div>
        <b-tabs content-class="mt-3" v-model="tabIndex" v-else-if="showTab===1">
          <b-tab :title="tab" v-for="(tab, tindex) in tabTokens" :key="tindex">
            <b-list-group>
              <b-list-group-item v-for="(item, index) in tokenItems[tindex+(orderType-1)*4]" :key="index">
                <div class="w-100">
                  <div class="flex-row-center" v-if="orderType===1">
                    <div class="medium-text">ID:{{item.id}}|{{item.seller}}</div>
                    <div class="small-text">{{players[item.seller] && players[item.seller].success_count ? players[item.seller].success_count: 0}}|
                      {{players[item.seller] && players[item.seller].success_count ? ((players[item.seller].success_count - players[item.seller].arbitrate_count) * 100/players[item.seller].success_count).toFixed(2): 0 }}%
                    </div>
                  </div>
                  <div class="flex-row-center" v-else-if="orderType===2">
                    <div class="medium-text">ID:{{item.id}}|{{item.buyer}}</div>
                    <div class="small-text">{{players[item.buyer] && players[item.buyer].success_count ? players[item.buyer].success_count: 0}}|
                      {{players[item.buyer] && players[item.buyer].success_count ? ((players[item.buyer].success_count - players[item.buyer].arbitrate_count) * 100 /players[item.buyer].success_count).toFixed(2): 0 }}%
                    </div>
                  </div>
                  <template v-if="orderType===1">
                    <div class="flex-row-center order-text" v-if="item.type < 10">
                      <div>
                        <div>数量 {{item.pay}}</div>
                        <div>限额 = ￥{{item.pay && (item.pay.split(" ")[0] * item.price / priceLen).toFixed(2)}}</div>
                      </div>
                      <div>
                        <div>单价</div>
                        <div>￥{{(item.price / priceLen).toFixed(priceFix)}}</div>
                      </div>
                    </div>
                  </template>
                  <template v-else-if="orderType===2">
                    <div class="flex-row-center order-text" v-if="item.type < 10">
                      <div>
                        <div>数量 {{item.buy_pay}}</div>
                        <div>限额 = ￥{{item.buy_pay && (item.buy_pay.split(" ")[0] * item.price / priceLen).toFixed(2)}}</div>
                      </div>
                      <div>
                        <div>单价</div>
                        <div>￥{{(item.price / priceLen).toFixed(priceFix)}}</div>
                      </div>
                    </div>
                  </template>
                  <div class="flex-row-center" v-if="item.type < 10">
                    <img :src="payIcons[item.pay_type]" class="pay-icon" :id="`tooltip-img-${item.id}`"/>
                    <b-tooltip :target="`tooltip-img-${item.id}`" triggers="hover" placement="left" variant="danger" v-if="item.type===1">
                      <div style="background-color: #fff;margin:1px">
                        <qriously :value="acctDecode(acctInfos[item.seller][item.pay_type].acct)" :size="150" v-if="acctInfos[item.seller] && acctInfos[item.seller][item.pay_type]"/>
                      </div>
                    </b-tooltip>
                    <b-tooltip :target="`tooltip-img-${item.id}`" triggers="hover" placement="left" variant="danger" v-else-if="item.type===2">
                      <div style="background-color: #fff;margin:1px">
                        <qriously :value="acctDecode(acctInfos[qrAccount(item)][item.pay_type].acct)" :size="150" v-if="acctInfos[qrAccount(item)] && acctInfos[qrAccount(item)][item.pay_type]"/>
                      </div>
                    </b-tooltip>
                    <div>
                      <span class="order-text mr-2">{{moment(item.dateline/1000).fromNow()}}</span>
                      <b-button variant="primary" @click="transferToken(item)" :disabled="account.name === item.seller || account.name === item.buyer || buttonSpiner">
                        {{item.type === 1 ? '购买' : '出售' }}
                      </b-button>
                    </div>
                  </div>
                </div>
              </b-list-group-item>
            </b-list-group>
          </b-tab>
        </b-tabs>
        <b-tabs content-class="mt-3" v-model="tabIndex2" v-else-if="showTab===2">
          <b-tab title="我的买单">
            <b-list-group>
              <b-list-group-item v-for="(item, index) in myBuyList" :key="index">
                <div class="w-100">
                  <div class="flex-row-center">
                    <div class="medium-text">ID:{{item.id}} | {{statusShow[item.status]}}</div>
                    <div class="small-text" v-if="acctInfos[item.seller]&&acctInfos[item.seller][item.pay_type]">
                      <div v-if="item.pay_type < 10">
                        <b-button :id="`tooltip-buy-${item.id}`" variant="primary">
                          {{accountTypes[acctInfos[item.seller][item.pay_type].id].text}}
                        </b-button>
                        <b-tooltip :target="`tooltip-buy-${item.id}`" triggers="hover" placement="left" variant="danger">
                          <div style="background-color: #fff;margin:1px">
                            <qriously :value="acctDecode(acctInfos[qrAccount(item)][item.pay_type].acct)" :size="150" v-if="acctInfos[qrAccount(item)] && acctInfos[qrAccount(item)][item.pay_type]"/>
                          </div>
                        </b-tooltip>
                      </div>
                      <span variant="primary" class="small-text"
                        v-else-if="item.pay_type > 10"
                        v-clipboard:copy="acctDecode(acctInfos[item.seller][item.pay_type].acct)"
                        v-clipboard:success="onCopy"
                        v-clipboard:error="onError">
                        {{accountTypes[acctInfos[item.seller][item.pay_type].id].text}}：{{acctDecode(acctInfos[item.seller][item.pay_type].acct)}}
                        点击复制账号
                      </span>
                    </div>
                    <b-button variant="primary" @click="getAcctInfo(item.seller)" v-else-if="!acctInfos[item.seller]">支付信息</b-button>
                  </div>
                  <div class="flex-row-center order-text mt-1">
                    <div>
                      <div>数量 {{item.pay}}
                        <span class="middle" v-if="item.seller"> | 
                            <b-badge variant="primary"
                            v-clipboard:copy="item.seller"
                            v-clipboard:success="onCopy"
                            v-clipboard:error="onError"
                            >{{`卖家:${item.seller}`}}
                          </b-badge>
                        </span>
                      </div>
                      <div>总价:
                        <b-badge 
                          variant="primary"
                          v-clipboard:copy="(item.buy_pay.split(' ')[0] * item.price / priceLen).toFixed(2)"
                          v-clipboard:success="onCopy"
                          v-clipboard:error="onError">
                          ￥{{item.buy_pay && (item.buy_pay.split(" ")[0] * item.price / priceLen).toFixed(2)}}
                        </b-badge>
                      </div>
                    </div>
                    <div>
                      <div>单价</div>
                      <div>￥{{(item.price / priceLen).toFixed(priceFix)}}</div>
                    </div>
                  </div>
                  <div v-if="item.status>3">
                    <div class="medium-text">仲裁记录<span class="text-info small">(无上诉1:0获胜,上诉后需要至少3票并多于对方票数才能提现)</span>:</div>
                    <div class="medium-text">{{item.buyer}} {{item.win ? ` ${item.win.buy}:${item.win.sell} `:'0:0'}} {{item.seller}}</div>
                  </div>
                  <div class="flex-row-center order-text" v-for="(arb, index1) in arbsItems[item.id]" :key="index1">
                    <div>
                      <div>仲裁人: {{arb.account}}</div>
                      <div>判定：{{arb.win ===1 ? '卖家': '买家'}} 胜诉</div>
                    </div>
                    <div>
                      <div>{{moment(arb.dateline/1000).fromNow()}}</div>
                    </div>
                  </div>
                  <div class="flex-row-center">
                    <img :src="payIcons[item.pay_type]" class="pay-icon" :id="`tooltip-mybuy-${item.id}`" />
                    <div v-if="item.pay_type < 10">
                      <b-tooltip :target="`tooltip-mybuy-${item.id}`" triggers="hover" placement="left" variant="danger">
                        <div style="background-color: #fff;margin:1px">
                          <qriously :value="acctDecode(acctInfos[qrAccount(item)][item.pay_type].acct)" :size="150" v-if="acctInfos[qrAccount(item)] && acctInfos[qrAccount(item)][item.pay_type]"/>
                        </div>
                      </b-tooltip>
                    </div>
                    <div>
                      <span class="order-text mr-1">{{moment(item.dateline/1000).fromNow()}}</span>
                      <b-button size="sm" variant="primary" v-if="item.status === 1 && item.type === 2" @click="cancelOrder(item)" :disabled="buttonSpiner" class="mr-1">取消</b-button>
                      <b-button size="sm" variant="primary" v-if="item.status >= 2" @click="cancelOrder(item)" :disabled="buttonSpiner" class="mr-1">取消</b-button>
                      <b-button size="sm" variant="primary" v-if="item.status === 2" @click="applyarbOrder(item)">申请仲裁</b-button>
                      <span v-else-if="item.status === 4">
                        <b-button size="sm" variant="primary" @click="appealOrder(item)" class="mr-1" v-if="(item.win && item.win.buy < item.win.sell)">申诉</b-button>
                        <b-button size="sm" variant="primary" @click="withdraw(item)" v-if="(item.win && item.win.buy > item.win.sell) && moment().valueOf() - item.dateline / 1000 > 3600 * 1 * 10">仲裁提现</b-button>
                      </span>
                      <b-button size="sm" variant="primary" v-else-if="item.status === 5" @click="withdraw(item)" :disabled="!(item.win && item.win.buy >= 3 && item.win.buy > item.win.sell)">胜诉提现</b-button>
                    </div>
                  </div>
                </div>
              </b-list-group-item>
            </b-list-group>
          </b-tab>
          <b-tab title="我的卖单">
            <b-list-group>
              <b-list-group-item v-for="(item, index) in mySellList" :key="index">
                <div class="w-100">
                  <div class="flex-row-center">
                    <div class="medium-text">{{`ID:${item.id}`}} | {{statusShow[item.status]}} {{item.type===3?'|入场单':''}}</div>
                    <b-button size="sm" variant="warning" @click="cancelOrder(item)" :disabled="buttonSpiner" v-if="item.status === 1">取消</b-button>
                    <b-button size="sm" variant="warning" @click="resultOrder(item)" :disabled="buttonSpiner" v-else-if="item.status >= 2">确认收款</b-button>
                  </div>
                  <div class="flex-row-center  mt-1" v-if="item.status > 1">
                    <div class="medium-text">买家:<b-badge 
                      variant="primary"
                      v-clipboard:copy="item.buyer"
                      v-clipboard:success="onCopy"
                      v-clipboard:error="onError">{{item.buyer}} </b-badge></div>
                    <div class="small-text" v-if="acctInfos[item.buyer]&&acctInfos[item.buyer][item.pay_type]">
                      <div v-if="item.pay_type < 10">
                        <b-button :id="`tooltip-buyer-${item.id}`" variant="primary">
                          {{accountTypes[acctInfos[item.buyer][item.pay_type].id].text}}
                        </b-button>
                        <b-tooltip :target="`tooltip-buyer-${item.id}`" triggers="hover" placement="left" variant="danger">
                          <div style="background-color: #fff;margin:1px">
                            <qriously :value="acctDecode(acctInfos[qrAccount(item)][item.pay_type].acct)" :size="150" v-if="acctInfos[qrAccount(item)] && acctInfos[qrAccount(item)][item.pay_type]"/>
                          </div>
                        </b-tooltip>
                      </div>
                    </div>
                    <b-button size="sm" variant="primary" @click="getAcctInfo(item.buyer)" v-else-if="!acctInfos[item.buyer]">支付信息</b-button>
                  </div>
                  <div class="flex-row-center order-text">
                    <div v-if="item.type === 1">
                      <div>数量：{{item.pay}}</div>
                      <div>总额：<b-badge v-if="item.buy_pay"
                          variant="primary"
                          v-clipboard:copy="(item.pay.split(' ')[0] * item.price / priceLen).toFixed(2)"
                          v-clipboard:success="onCopy"
                          v-clipboard:error="onError">
                          ￥{{(item.pay.split(" ")[0] * item.price / priceLen).toFixed(2)}}
                        </b-badge>
                      </div>
                    </div>
                    <div v-else-if="item.type === 3">
                      <div>入场单, 抵押数量 {{item.pay}}</div>
                      <div>总额 ￥{{item.pay && (item.pay.split(" ")[0] * item.price / priceLen).toFixed(2)}}</div>
                    </div>
                    <div>
                      <div>单价</div>
                      <div>￥{{(item.price / priceLen).toFixed(priceFix)}}</div>
                    </div>
                  </div>
                 <div v-if="item.status>3">
                    <div class="medium-text">仲裁记录<span class="text-info small">(无上诉1:0获胜,上诉后需要至少3票并多于对方票数才能提现)</span>:</div>
                    <div class="medium-text">{{item.buyer}}<span class="text-warning"> {{item.win ? ` ${item.win.buy}:${item.win.sell} `:'0:0'}}</span> {{item.seller}}</div>
                  </div>
                  <div class="flex-row-center order-text" v-for="(arb, index1) in arbsItems[item.id]" :key="index1">
                    <div>
                      <div>仲裁人: {{arb.account}}</div>
                      <div>判定：{{arb.win ===1 ? '卖家': '买家'}} 胜诉</div>
                    </div>
                    <div>
                      <div>{{moment(arb.dateline/1000).fromNow()}}</div>
                    </div>
                  </div>
                  <div class="flex-row-center">
                    <img :src="payIcons[item.pay_type]" class="pay-icon" :id="`tooltip-mysell-${item.id}`" />
                      <div v-if="item.pay_type < 10">
                        <b-tooltip :target="`tooltip-mysell-${item.id}`" triggers="hover" placement="left" variant="danger">
                          <div style="background-color: #fff;margin:1px">
                            <qriously :value="acctDecode(acctInfos[qrAccount(item)][item.pay_type].acct)" :size="150" v-if="acctInfos[qrAccount(item)] && acctInfos[qrAccount(item)][item.pay_type]"/>
                          </div>
                        </b-tooltip>
                      </div>
                      <div>
                      <span class="order-text mr-1">{{moment(item.dateline/1000).fromNow()}}</span>
                      <b-button size="sm" variant="primary" v-if="item.status === 1" @click="updateorderModal=true;selectItem=item; orderPrice = item.price / priceLen">更改价格</b-button>
                      <b-button size="sm" variant="primary" v-else-if="item.status === 2" @click="applyarbOrder(item)" class="mr-1">申请仲裁</b-button>
                      <b-badge  size="sm" variant="info" v-else-if="item.status === 3">仲裁中</b-badge>
                      <span v-else-if="item.status === 4">
                        <b-button size="sm" variant="primary" @click="appealOrder(item)" class="mr-1" v-if="(item.win && item.win.buy > item.win.sell)">申诉</b-button>
                        <b-button size="sm" variant="primary" @click="withdraw(item)" v-if="(item.win && item.win.buy < item.win.sell) && moment().valueOf() - item.dateline / priceLen > 3600 * 1 * 1000">仲裁提现</b-button>
                      </span>
                      <b-button size="sm" variant="primary" v-else-if="item.status === 5 && (item.win && item.win.buy >= 3 && item.win.buy > item.win.sell)" @click="resultOrder(item)">败诉确认</b-button>
                      <b-button size="sm" variant="primary" v-else-if="item.status === 5" @click="withdraw(item)" :disabled="!(item.win && item.win.sell >= 3 && item.win.sell > item.win.buy)">胜诉解除锁定</b-button>
                    </div>
                  </div>
                </div>
              </b-list-group-item>
            </b-list-group>
          </b-tab>
          <b-tab title="寻找仲裁" @click="getArbGroups">
            <b-list-group>
              <b-list-group-item v-for="(item, index) in arbGroups" :key="index">
                <div class="flex-row-center">
                  <img :src="payIcons[0]" class="pay-icon" :id="`tooltip-arb-${item.account}`"/>
                  <b-tooltip :target="`tooltip-arb-${item.account}`" triggers="hover" placement="left" variant="danger">
                    <div style="background-color: #fff;margin:1px">
                      <qriously :value="acctDecode(item.acct)" :size="150"/>
                    </div>
                  </b-tooltip>
                  <div>
                    <span class="order-text mr-2">{{item.account}}</span>
                  </div>
                </div>
              </b-list-group-item>
            </b-list-group>
          </b-tab>
          <b-tab title="参与仲裁" @click="getArbList" v-if="myFO>100000||arbAcct">
            <b-list-group>
              <b-list-group-item v-for="(item, index) in arbList" :key="index">
                <div class="w-100">
                  <div class="flex-row-center">
                    <div class="medium-text">ID: {{item.id}} | {{item.status === 3 ? `等待仲裁` : '仲裁中'}}</div>
                    <b-button size="sm" variant="warning" @click="cancelOrder(item)" :disabled="buttonSpiner" v-if="item.status === 1">取消</b-button>
                    <b-button size="sm" variant="warning" @click="resultOrder(item)" :disabled="buttonSpiner" v-else-if="item.status === 2">确认收款</b-button>
                  </div>
                  <div class="flex-row-center order-text">
                    <div v-if="item.type === 1">
                      <div>数量 {{item.pay}}</div>
                      <div>总额 ￥{{item.pay && (item.pay.split(" ")[0] * item.price / priceLen).toFixed(2)}}</div>
                    </div>
                    <div v-else-if="item.type === 3">
                      <div>入场单, 抵押数量 {{item.pay}}</div>
                      <div>总额 ￥{{item.pay && (item.pay.split(" ")[0] * item.price / priceLen).toFixed(2)}}</div>
                    </div>
                    <div>
                      <div>单价</div>
                      <div>￥{{(item.price / priceLen).toFixed(priceFix)}}</div>
                    </div>
                  </div>
                  <div class="flex-row-center order-text" v-for="(arb, index1) in arbsItems[item.id]" :key="index1">
                    <div>
                      <div>仲裁人: {{arb.account}}</div>
                      <div>判定：{{arb.win ===1 ? '卖家': '买家'}} 胜诉</div>
                    </div>
                    <div>
                      <div>{{moment(arb.dateline/1000).fromNow()}}</div>
                    </div>
                  </div>
                  <b-form-group label="请选择你认为获胜方？">
                    <b-form-radio v-model="item.win" name="some-radios" value="1">卖方:{{item.seller}}|联系信息</b-form-radio>
                    <div v-if="acctInfos[item.seller]&&acctInfos[item.seller][item.pay_type]">
                      <div v-if="item.pay_type < 10">
                        <b-button :id="`tooltip-arb-seller-${item.id}`">
                          {{accountTypes[acctInfos[item.seller][item.pay_type].id].text}}
                        </b-button>
                        <b-tooltip :target="`tooltip-arb-seller-${item.id}`" triggers="hover" placement="left" variant="danger">
                          <div style="background-color: #fff;margin:1px">
                            <qriously :value="acctDecode(acctInfos[qrAccount(item)][item.pay_type].acct)" :size="150" v-if="acctInfos[qrAccount(item)] && acctInfos[qrAccount(item)][item.pay_type]"/>
                          </div>
                        </b-tooltip>
                      </div>
                    </div>
                    <b-form-radio v-model="item.win" name="some-radios" value="2">买方:{{item.buyer}}|联系信息</b-form-radio>
                    <div v-if="acctInfos[item.buyer]&&acctInfos[item.buyer][item.pay_type]">
                      <div v-if="item.pay_type < 10">
                        <b-button :id="`tooltip-arb-buyer-${item.id}`">
                          {{accountTypes[acctInfos[item.buyer][item.pay_type].id].text}}
                        </b-button>
                        <b-tooltip :target="`tooltip-arb-buyer-${item.id}`" triggers="hover" placement="left" variant="danger">
                          <div style="background-color: #fff;margin:1px">
                            <qriously :value="acctDecode(acctInfos[qrAccount(item)][item.pay_type].acct)" :size="150" v-if="acctInfos[qrAccount(item)] && acctInfos[qrAccount(item)][item.pay_type]"/>
                          </div>
                        </b-tooltip>
                      </div>
                    </div>
                  </b-form-group>
                  <div class="flex-row-center">
                    <img :src="payIcons[item.pay_type]" class="pay-icon" />
                    <div v-if="item.status >= 3">
                      <b-button variant="primary"  @click="arbitratebOrder(item)" :disabled="arbAcct||account.name==item.buyer||account.name==item.seller">确认胜诉</b-button>
                    </div>
                  </div>
                </div>
              </b-list-group-item>
            </b-list-group>
          </b-tab>
        </b-tabs>
      </template>
      <template v-else-if="showTemp === 2">
        <div style="margin: 2vw">
          <h4 class="primary" style="font-weight: bold;">收款信息</h4>
        </div>
        <div class="w-100" style="min-height:400px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <div class="w-100 p-4">
            已设置：<br/>
            <div class="m-2" v-if="acctInfos[account.name]">
              <div v-for="(acctInfo,index) in acctInfos[account.name]" :key="acctInfo.id">
                {{index}}.
                <div v-if="acctInfo.id < 10">
                  <b-button :id="`tooltip-target-${acctInfo.id}`">
                    {{accountTypes[acctInfo.id].text}}
                  </b-button>
                  <b-tooltip :target="`tooltip-target-${acctInfo.id}`" triggers="hover" placement="left" variant="danger">
                    <div style="background-color: #fff;margin:1px">
                      <qriously :value="acctDecode(acctInfo.acct)" :size="150" v-if="acctInfo.acct"/>
                    </div>
                  </b-tooltip>
                </div>
                <span variant="primary" class="small-text"
                  v-else-if="acctInfo.id > 10"
                  v-clipboard:copy="acctDecode(acctInfo.acct)"
                  v-clipboard:success="onCopy"
                  v-clipboard:error="onError">
                  {{accountTypes[acctInfo.id].text}}：{{acctDecode(acctInfo.acct)}}
                  点击复制账号
                </span>
                </div>
              <br/>
            </div>
            <b-form @submit.prevent="accountSubmit" @reset.prevent="accountReset">
              <b-form-group
                id="payAccountGroup"
                label="收款类型设置:"
                label-for="payAccount"
              >
                <b-form-select
                  id="sellAccount"
                  v-model="sellAccount"
                  :options="accountTypes"
                  required
                ></b-form-select>
              </b-form-group>
              <b-form-group
                id="payAccountGroup"
                label="上传:"
                label-for="payAccount"
              >
                <div v-if="sellAccount < 10" class="mt-2">
                  <qrcode-capture @decode="onDecode" @detect="onDetect" :capture="null"/>
                  <qriously :value="resultCode" :size="200" v-if="resultCode" />
                </div>
                <template v-else-if="sellAccount > 10">
                  <b-form-input
                    id="payAccount"
                    v-model="payAccount"
                    type="text"
                    required
                    placeholder="账号|Account..."
                  ></b-form-input>
                </template>
                <!-- <img :src="qrImg" /> -->
              </b-form-group>
              <div class="text-right">
                <b-button type="submit" class="mr-4" variant="primary" :disabled="buttonSpiner"><b-spinner small type="grow" v-if="buttonSpiner"/>提交</b-button>
                <b-button variant="danger" @click="showTemp=1">返回</b-button>
              </div>
            </b-form>
            <!-- <b-button variant="outline-primary">+ 添加</b-button> -->
          </div>
        </div>
      </template>
      <template v-else-if="showTemp === 3">
        <div style="margin: 2vw">
          <h4 class="primary" style="font-weight: bold;">出售信息</h4>
        </div>
        <div class="w-100" style="min-height:400px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <div class="w-100 p-4">
            <b-form @submit.prevent="orderSubmit" @reset.prevent="orderReset">
              <b-form-group id="orderTypeGroup" label="挂单类型:" label-for="orderType">
                <b-form-select
                  id="orderType"
                  v-model="orderType"
                  :options="orderTypes"
                  required
                ></b-form-select>
              </b-form-group>
              <b-form-group id="sellAccountGroup" label="收款设置:" label-for="sellAccount">
                <b-form-select
                  id="sellAccount"
                  v-model="sellAccount"
                  :options="myAccounts"
                  required
                ></b-form-select>
              </b-form-group>
              <b-form-group id="sellTokenGroup" label="TOKEN:" label-for="sellToken">
                <b-form-select
                  id="sellToken"
                  v-model="sellToken"
                  :options="tokens"
                  required
                  :disabled="orderType === 3"
                ></b-form-select>
              </b-form-group>
              <b-form-group
                id="payTokenGroup"
                :label="orderTypeMsg[orderType]"
                label-for="payToken"
              >
              <b-form-input
                id="payToken"
                v-model="payToken"
                type="number"
                required
                placeholder="1000"
                :disabled="orderType === 3"
              ></b-form-input>
              </b-form-group>
              <b-form-group
                id="orderPriceGroup"
                label="单价(￥):"
                label-for="orderPrice"
              >
                <b-form-input
                  id="orderPrice"
                  v-model="orderPrice"
                  type="text"
                  required
                  placeholder="1"
                  :disabled="orderType === 3"
                ></b-form-input>
              </b-form-group>
              <div class="text-right">
                <b-button type="submit" class="mr-4" variant="primary" :disabled="buttonSpiner"><b-spinner small type="grow" v-if="buttonSpiner"/>提交</b-button>
                <b-button variant="danger" @click="showTemp=1">返回</b-button>
              </div>
            </b-form>
            <!-- <b-button variant="outline-primary">+ 添加</b-button> -->
          </div>
        </div>
      </template>
       <template v-else-if="showTemp === 4">
        <div style="margin: 2vw">
          <h4 class="primary" style="font-weight: bold;">仲裁</h4>
        </div>
        <div class="w-100" style="min-height:400px; display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <div class="w-100 p-4">
            <b-form @submit.prevent="arbGroupSubmit" @reset.prevent="accountReset">
              <b-form-group
                id="payAccountGroup"
                label="上传联系群二维码:"
                label-for="payAccount"
              >
                <div v-if="sellAccount < 10" class="mt-2">
                  <qrcode-capture @decode="onDecode" @detect="onDetect" :capture="null"/>
                  <qriously :value="resultCode" :size="200" v-if="resultCode" />
                </div>
                <!-- <img :src="qrImg" /> -->
              </b-form-group>
              <div class="text-right">
                <b-button type="submit" class="mr-4" variant="primary" :disabled="buttonSpiner"><b-spinner small type="grow" v-if="buttonSpiner"/>提交</b-button>
                <b-button variant="danger" @click="showTemp=1">返回</b-button>
              </div>
            </b-form>
            <!-- <b-button variant="outline-primary">+ 添加</b-button> -->
          </div>
        </div>
      </template>
    </main>
    <b-modal id="updateorder" title="更改单价(￥)" ok-only v-model="updateorderModal" @ok="updateOrder()" centered>
      <b-form-input v-model="orderPrice" placeholder="1.00" type="number"></b-form-input>
    </b-modal>
    <b-modal v-model="tranHash" centered hide-header hide-footer>
      <div :class="tranText">{{tranMsg}}</div>
    </b-modal>
    <b-modal id="bv-modal-example" centered hide-footer hide-header v-model="showMsg">
      <div class="d-block text-center">
        <h3>{{modalMsg}}</h3>
      </div>
      <b-button class="mt-3" block @click="showMsg=false;showTemp=2;">确定</b-button>
    </b-modal>
    <b-modal v-model="buttonSpiner"
      centered
      hide-footer
      hide-header-close
      hide-header
      no-close-on-backdrop
      hide-backdrop
      content-class="hide-modal-content"
    >
      <div class="text-center">
        <b-spinner large/>
      </div>
    </b-modal>
    <b-modal v-model="ruleShow" @ok="handleOk" centered>
      <b-list-group class="text-danger">
        <b-list-group-item v-for="(item, index) in $t('otcRules')" :key="index">{{index+1}}.{{item}}</b-list-group-item>
      </b-list-group>
    </b-modal>
  </div>
</template>

<script>
  // import axios from "axios";
  const Fo = require("fibos.js");

  import Vue from "vue";
  import VueClipboard from "vue-clipboard2"
  import VueQriously from 'vue-qriously'
  Vue.use(VueQriously)
  import { QrcodeCapture } from 'vue-qrcode-reader'
  // import VueQArt from 'vue-qart'
  Vue.use(VueClipboard);
  const moment = require('moment');
  const Base64 = require('js-base64').Base64;

  const items = []

  // 仲裁超过3个bp认准，最终胜诉
  const arbitrater_count = 3;
  // 仲裁bp需要投票数
  const bp_total_votes = 800000000000;
  // 大户的FO数量定义
  const rich_limit = 200000;
  // 仲裁时间
  const arbitrate_timeout = 3600 * 24 * 1000 * 1000;
  // 上诉时间
  const appeal_timeout = 3600 * 24 * 1000 * 1000;
  // 每单限制
  const pay_limit = 20000000;
  // 系统维护中
  const is_maintenance = 0;
  // 抵押费用
  const staking_pay = 10000000;
  // 服务费用
  const service_pay = 10000;

  const foMainChain =
    "6aa7bd33b6b45192465afa3553dedb531acaaff8928cf64b70bd4c5e49b7ec6a"
  const foTestChain =
    "68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a"

  const CONTRACT = 'fibosuserp2p'

  export default {
    name: "fibosuserp2p",
    components: { QrcodeCapture },
    mounted() {
      document.title = "FO OTC";
      if (this.$route.query.debug == "fo") {
        this.selectNet = "foTest";
      }
      const foNetwork = this.network[this.selectNet];
      this.fo = Fo({
        chainId: this.chains[this.selectNet],
        httpEndpoint:`${location.protocol}//${foNetwork.reqHost}:${location.protocol === 'http:'? foNetwork.port: foNetwork.reqPost }`,
      })
      this.getRecords();
      this.getPlayers();
      this.initIronman();
      if (!localStorage.getItem("showRule")) {
        this.ruleShow = true;
        localStorage.setItem("showRule", 1);
      }
    },
    computed: {
      myAccounts () {
        if (this.acctInfos[this.account.name]) {
          const acctInfo = this.acctInfos[this.account.name]
          for (var i in acctInfo){
            acctInfo[i].value = this.accountTypes[acctInfo[i].id].value
            acctInfo[i].text = this.accountTypes[acctInfo[i].id].text
          }
          return acctInfo
        }
        return []
      }
    },
    created () {
      //页面刚进入时开启长连接
      this.initWebSocket()
    },
    destroyed() {
      //页面销毁时关闭长连接
      this.websocketclose();
    },
    data() {
      return {
        priceFix: 4,
        priceLen: 10000, // 以厘为单位
        orderTypeMsg: {
          1: '卖出数量',
          2: '买入数量，1.0000 FO服务费',
          3: '需抵押1000.0000 FO,退出收取1%服务费',
        },
        arbWin: null,
        mySellList: {},
        myBuyList: {},
        arbGroups: [],
        showTab: 1,
        tabIndex: 0,
        tabIndex2: 0,
        tabTokens: ['FO', 'FOUSDT', 'FODAI', 'FOETH', 'FOUSDK'],
        selectToken: 'FO', 
        sellToken: 'FO',
        orderType: 1,
        orderTypes: [{ text: '卖单', value: 1 }, { text: '买单', value: 2 }, { text: '挂进场单', value: 3 }],
        sellAccount: 0,
        showTemp: 1,
        account: {},
        aliAccount: '',
        items: items,
        ruleShow: false,
        tranHash: false,
        tranMsg: "",
        tranText: "text-success",
        tokens: [{ text: 'FOUSDT', value: 'FOUSDT' }, { text: 'FO', value: 'FO' }, { text: 'FODAI', value: 'FODAI' }, { text: 'FOETH', value: 'FOETH' }, { text: 'FOUSDK', value: 'FOUSDK' },],
        accountTypes: [
          { text: '微信群二维码', value: 0 },
          { text: '微信收款二维码', value: 1 },
          { text: '微信账号二维码', value: 2 },
          { text: '支付宝群二维码', value: 3 },
          { text: '支付宝收款二维码', value: 4 },
          { text: '支付宝账号二维码', value: 6 },
          { text: '电报二维码', value: 7 }
        ],
        contractBalance: [{ text: '支付宝', value: 'aliPay' }],
        selectNet: "foMain",
        chains: {
          foTest: foTestChain,
          foMain: foMainChain
        },
        network: {
          foTest: {
            name: "FO test",
            protocol: "http",
            port: 80,
            reqPost: 80,
            host: "api.testnet.fo",
            reqHost: 'api.testnet.fo',
            blockchain: "fibos",
            chainId: foTestChain,
            backupServer: "",
            http: 'http',
            ticketUrl: ''
          },
          foMain: {
            name: "FIBOS Mainnet",
            protocol: "http",
            reqPost: 443,
            blockchain: "fibos",
            chainId: foMainChain,
            host: "to-rpc.fibos.io",
            reqHost: 'rpc-mainnet.bitewd.com',
            port: 8870,
            backupServer: "",
            http: 'http',
            ticketUrl: 'https://api.aex.plus'
          }
        },
        copyData: "",
        audio: null,
        actionText: '我要买',
        isNewAccount: true,
        payAccount: '',
        orderPrice: 1,
        myBalance: [],
        payToken: 1000,
        tokenLength: 4,
        player: {},
        players: [],
        tokenItems: [{},{},{},{},{},{},{},{},{},{}],
        tokenItems3: {},
        acctInfos: {},
        updateorderModal: false,
        selectItem: null,
        buttonSpiner: false,
        tokenPrice: {},
        contractConfig:  [
          arbitrater_count,
          bp_total_votes,
          rich_limit,
          arbitrate_timeout,
          appeal_timeout,
          pay_limit,
          is_maintenance,
          service_pay,
          staking_pay,
        ],
        websock: null,
        arbList: {},
        arbsItems: {},
        statusShow: {
          1: '挂单中',
          2: '锁定中',
          3: '申请仲裁中',
          4: '仲裁中',
          5: '上诉判定'
        },
        myFO: 0,
        showToken: 'TOKEN',
        arbAcct: null,
        showMsg: false,
        modalMsg: '',
        qrImg: null,
        resultCode: null,
        payIcons: [
          require('../assets/group.png'),
          require('../assets/wechat.png'),
          require('../assets/wechat.png'),
          require('../assets/group2.png'),
          require('../assets/alipay.png'),
          require('../assets/alipay.png')
        ]
      };
    },
    methods: {
      qrAccount(item) {
        return item.type === 2 ? item.buyer:item.seller
      }, 
      handleOk() {},
      async onDetect(promise) {
        try {
          const {
            imageData,    // raw image data of image/frame
            content,      // decoded String or null
            location      // QR code coordinates or null
          } = await promise
          console.log(imageData, content, location)
          if (content === null) {
            // decoded nothing
          } else {
            // ...
          }
        } catch (error) {
          // ...
        }
      },
      onDecode (result) {
        this.resultCode = result
      },
      tranModal(show, msg, text) {
        if (msg) {
          this.tranMsg = msg;
        }
        if (text) {
          this.tranText = text;
        }
        this.tranHash = show;
      },
      async accountSubmit () {
        // 执行智能合约
        this.buttonSpiner = true
        const payAccount = this.sellAccount > 10 ? this.payAccount: this.resultCode
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.setinfo(this.sellAccount, Base64.encode(payAccount), '', {
            authorization: `${this.account.name}@active`
          });
          console.log(trx);
          this.tranModal(true, "设置成功", "text-success");
          this.getAcctInfo(this.account.name)
        } catch (e) {
          console.log("error", e);
          this.tranModal(true, "设置失败", "text-danger");
        }
        this.buttonSpiner = false
      },
      async arbGroupSubmit () {
        // 执行智能合约
        this.buttonSpiner = true
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.setgroup(Base64.encode(this.resultCode), {
            authorization: `${this.account.name}@active`
          });
          console.log(trx);
          this.tranModal(true, "设置成功", "text-success");
          this.getAcctInfo(this.account.name)
        } catch (e) {
          console.log("error", e);
          this.tranModal(true, "设置失败", "text-danger");
        }
        this.buttonSpiner = false
      },
      async updateOrder () {
        // 更改价格
        this.buttonSpiner = true
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.updateorder(this.selectItem.id, parseInt(this.orderPrice * this.priceLen) , {
            authorization: `${this.account.name}@active`
          });
          console.log(trx)
          this.selectItem.price = Number(this.orderPrice) * this.priceLen
          this.$set(this.mySellList, this.selectItem.id, this.selectItem)
          this.tranModal(true, "更新成功", "text-success");
        } catch (e) {
          console.error("error", e);
          this.tranModal(true, "更新失败", "text-danger");
        }
        this.buttonSpiner = false
      },
      async cancelOrder (item) {
        this.buttonSpiner = true
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.cancelorder(item.id, {
            authorization: `${this.account.name}@active`
          });
          if (item.buyer === this.account.name) {
            this.$delete(this.myBuyList, item.id)
          } else if (item.seller === this.account.name) {
            this.$delete(this.mySellList, item.id)
          }
          this.tranModal(true, "取消成功", "text-success");
          console.log(trx)
        } catch (e) {
          console.log("error", e);
          this.tranModal(true, "取消失败", "text-danger");
        }
        this.buttonSpiner = false
      },
      async resultOrder(item) {
        this.buttonSpiner = true
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.result(item.id, {
            authorization: `${this.account.name}@active`
          });
          if (item.buyer === this.account.name) {
            this.$delete(this.myBuyList, item.id)
          } else if (item.seller === this.account.name) {
            this.$delete(this.mySellList, item.id)
          }
          this.tranModal(true, "确认成功，订单转账成功！", "text-success");
          console.log(trx)
        } catch (e) {
          console.error("error", e);
          this.tranModal(true, "确认失败！", "text-danger");
        }
        this.buttonSpiner = false
      },
      async arbitratebOrder (item) {
        const win = Number(item.win)
        this.buttonSpiner = true
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.arbitrate(item.id, win, '胜诉', {
            authorization: `${this.account.name}@active`
          });
          console.log(trx)
          this.tranModal(true, "成功仲裁中", "text-success");
          // item.dateline = new Date().getTime() * 1000;
          item.status = 4
          if (item.seller === this.account.name) {
            this.$set(this.mySellList, item.id, item)
          } else if (item.buyer === this.account.name) {
            this.$set(this.mySellList, item.id, item)
          }
          this.getArbs()
        } catch (e) {
          console.error("error", e);
          this.tranModal(true, "仲裁失败", "text-danger");
        }
        this.buttonSpiner = false
      },
      async applyarbOrder(item) {
        this.buttonSpiner = true
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.applyarb(item.id, {
            authorization: `${this.account.name}@active`
          });
          this.tranModal(true, "申请仲裁中", "text-success");
          item.dateline = new Date().getTime() * 1000;
          item.status = 3
          if (item.seller === this.account.name) {
            this.$set(this.mySellList, item.id, item)
          } else if (item.buyer === this.account.name) {
            this.$set(this.mySellList, item.id, item)
          }
          console.log(trx)
        } catch (e) {
          console.error("error", e);
          this.tranModal(true, "申请仲裁失败", "text-danger");
        }
        this.buttonSpiner = false
      },
      async appealOrder(item) {
        this.buttonSpiner = true
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.appeal(item.id, {
            authorization: `${this.account.name}@active`
          });
          this.tranModal(true, "上诉中", "text-success");
          item.dateline = new Date().getTime() * 1000;
          item.status = 5
          if (item.seller === this.account.name) {
            this.$set(this.mySellList, item.id, item)
          } else if (item.buyer === this.account.name) {
            this.$set(this.mySellList, item.id, item)
          }
          console.log(trx)
        } catch (e) {
          this.tranModal(true, "上诉取消", "text-danger");
        }
        this.buttonSpiner = false
      },
      accountReset () {},
      invite() {
        this.modal = true;
        this.modalMsg = "复制成功：" + this.copyData
      },
      async transferToken (item) {
        if (item.type == 1) {
          this.buyToken(item)
        } else if (item.type == 2) {
          if (!this.assertAcct(this.account.name)) return;
          this.buttonSpiner = true;
          let payToken = item.buy_pay;
          // 以厘为单位
          let message = `4,${item.id}`;
          // 执行智能合约
          try {
            const contract = await this.fo.contract("eosio.token", {
              requiredFields: this.requiredFields
            });
            const trx = await contract.transfer(
              this.account.name,
              CONTRACT,
              payToken,
              message
            );
            console.log(trx);
            this.tranModal(true, "提交成功", "text-success");
            this.getRecords();
          } catch (e) {
            console.error("error", e);
            this.tranModal(true, "提交失败", "text-danger");
          }
          this.buttonSpiner = false;
        }
      },
      async buyToken(item) {
        // if (!this.assertAcct(this.account.name)) return;
        // 购买token
        this.buttonSpiner = true
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.buy(item.id, item.pay ,{
            authorization: `${this.account.name}@active`
          });
          console.log(trx)
          this.tranModal(true, "锁定订单成功", "text-success");
          this.getRecords();
        } catch (e) {
          console.error("error", e);
          this.tranModal(true, "锁定失败", "text-danger");
        }
        this.buttonSpiner = false
      },
      onCopy(e) {
        console.log(e);
        if (e.action === 'copy') {
          this.tranModal(true, "复制成功：" + e.text, "text-success");
        }
      },
      onError(e) {
        console.log(e);
      },
      Invest() {
        this.modal = true;
        this.modalMsg = "复制成功：" + this.copyData
      },
      async getAccount(account = CONTRACT) {
        let token
        try {
          token = await this.fo.getAccount(account);
        } catch (e) {
          return null;
        }
        return token;
      },
      async getBalance(account = CONTRACT) {
        let token
        try {
          token = await this.fo.getTableRows(true, "eosio.token", account, "accounts", "primary", 0, 100, 100);
        } catch (e) {
          return null;
        }
        return token.rows;
      },
      async getAcctInfo(account) {
        let res
        try {
          res = await this.fo.getTableRows(true, CONTRACT, account, "userinfos");
          this.$set(this.acctInfos, account, {})
          res.rows.forEach(item=>{
            this.$set(this.acctInfos[account], item.id, item)
          })
        } catch (e) {
          return null;
        }
        return res.rows;
      },
      async getArbGroups () {
        let res
        try {
          res = await this.fo.getTableRows(true, CONTRACT, CONTRACT, "arbgroups");
          this.arbGroups = res.rows;
        } catch (e) {
          return null;
        }
        return res.rows;
      },
      login() {
        this.reqIronman();
      },
      signout() {
        this.account = {};
        this.ironman.forgetIdentity(this.ironman.identity);
      },
      showRule() {
        this.ruleShow = true;
      },
      async getPlayer(account) {
        var token = null;
        try {
          token = await this.fo.getTableRows(true, CONTRACT, CONTRACT, "players", "id", account, -1, 1);
          this.player = token.rows[0]
        } catch (e) {
          console.log(e)
        }
        return token;
      },
      async getProducer(account) {
        let res = null;
        try {
          res = await this.fo.getTableRows(true, "eosio", "eosio", "producers", "owner", account, account, 1);
          if (res.rows[0]) {
            this.arbAcct = res.rows[0] 
          }
        } catch (e) {
          console.log(e)
        }
        return res;
      },
      async getPlayers() {
        let res = null;
        try {
          res = await this.fo.getTableRows(true, CONTRACT, CONTRACT, "players", "id", 0, "", 1000, "i64");
          res.rows.forEach(item=>{
            this.$set(this.players, item.id, item)
            // this.players[item.id] = item
          })
        } catch (e) {
          console.log(e)
        }
        return res;
      },
      async orderSubmit() {
        if (!this.assertAcct(this.account.name)) return;
        this.buttonSpiner = true;
        this.payAsset = this.sellToken
        let payToken = Number(this.payToken).toFixed(this.tokenLength) + ' ' + this.payAsset;
        // 以厘为单位
        let message = `${this.orderType},`;
        if (this.orderType === 1){
          message += `${parseInt(this.orderPrice * this.priceLen)}${this.sellAccount>-1?`,${this.sellAccount}`:',0'}`
        } else if (this.orderType === 2) {
          message += `${parseInt(this.orderPrice * this.priceLen)},${payToken}${this.sellAccount>-1?`,${this.sellAccount}`:',0'}`;
          payToken = '1.0000 FO'
        } else if (this.orderType === 3) {
          message += `${parseInt(this.orderPrice * this.priceLen)}${this.sellAccount>-1?`,${this.sellAccount}`:',0'}`;
          payToken = '1000.0000 FO'
        }
        // 执行智能合约
        try {
          const contract = await this.fo.contract("eosio.token", {
            requiredFields: this.requiredFields
          });
          const trx = await contract.transfer(
            this.account.name,
            CONTRACT,
            payToken,
            message
          );
          console.log(trx);
          this.tranModal(true, "提交成功", "text-success");
          this.getRecords();
        } catch (e) {
          console.error("error", e);
          this.tranModal(true, "提交失败", "text-danger");
        }
        this.buttonSpiner = false;
      },
      async withdraw(item) {
        this.buttonSpiner = true;
        try {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields
          });
          const trx = await contract.withdraw(item.id, { authorization: this.account.name });
          console.log("1.提现成功！", trx);
          this.tranModal(true, "提现成功", "text-success");
          item.dateline = new Date().getTime() * 1000;
          item.status = 1
          if (item.seller === this.account.name) {
            this.$set(this.mySellList, item.id, item)
          } else if (item.buyer === this.account.name) {
            this.$set(this.mySellList, item.id, item)
          }
          this.$delete(this.arbsItems, item.id)
        } catch (e) {
          console.error("error", e);
          this.tranModal(true, "提现取消", "text-danger");
        }
        this.buttonSpiner = false;
      },
      myOrders() {
        if (this.account.name) {
          this.showTab = 2
          this.getMyBuyList()
          this.getMySellList()
          this.getArbs()
        }
      },
      findArb() {
        this.showTab = 2
        this.tabIndex2 = 2
        this.getArbs()
      },
      async getMyBuyList() {
        try {
          const res = await this.fo.getTableRows(true, CONTRACT, CONTRACT,
          "records", "buyer", this.account.name, this.account.name, 100, "i64", 3, true);
          res.rows.forEach(item => {
            this.$set(this.myBuyList, item.id, item)
          });
        } catch (e) {
          console.error(e);
        }
      },
      async getMySellList() {
        // if (Object.keys(this.mySellList).length) return
        try {
          const res = await this.fo.getTableRows(true, CONTRACT, CONTRACT,
          "records", "seller", this.account.name, this.account.name, 100, "i64", 2, true);
          res.rows.forEach(item => {
            this.$set(this.mySellList, item.id, item)
          });
        } catch (e) {
          console.error(e);
        }
      },
      async getArbList() {
        if (Object.keys(this.arbList).length > 0) return;
        try {
          const res = await this.fo.getTableRows(true, CONTRACT, CONTRACT,
          "records", "", "", "", 1000, "i64", 1, true);
          res.rows.forEach(item => {
            item.win = null;
            if (item.status >= 3) {
              this.$set(this.arbList, item.id, item)
              // this.arbList[item.id] = item;
            }
            if (!this.acctInfos[item.seller]) {
              this.getAcctInfo(item.seller)
            }
            if (!this.acctInfos[item.buyer]) {
              this.getAcctInfo(item.buyer)
            }
          });
          this.getArbs()
        } catch (e) {
          console.error(e);
        }
      },
      async getRecords() {
        try {
          const res = await this.fo.getTableRows(true, CONTRACT, CONTRACT,
          "records", "", "", "", 1000, "i64", 1, true);
          res.rows.forEach(item=>{
            if (item.status === 1) {
              if ((item.type === 1 || item.type === 2)) {
                const key = (item.type-1) * 4
                const token = item.pay.split(' ')[1]
                if (token === 'FO') {
                  this.$set(this.tokenItems[0+key], item.id, item)
                } else if (token === 'FOUSDT') {
                  this.$set(this.tokenItems[1+key], item.id, item)
                } else if (token === 'FODAI') {
                  this.$set(this.tokenItems[2+key], item.id, item)
                } else if (token === 'FOETH') {
                  this.$set(this.tokenItems[3+key], item.id, item)
                } else if (token === 'FOUSDK') {
                  this.$set(this.tokenItems[4+key], item.id, item)
                } 
              } else if (item.type===3) {
                this.$set(this.tokenItems3, item.id, item)
              }
            }
            if (item.buyer&&!this.acctInfos[item.buyer]) {
              this.getAcctInfo(item.buyer)
            }
            if (item.seller&&!this.acctInfos[item.seller]) {
              this.getAcctInfo(item.seller)
            }
          });
        } catch (e) {
          console.error(e);
        }
      },
      async getArbs() {
        try {
          const res = await this.fo.getTableRows(true, CONTRACT, CONTRACT,
          "arbitration", "", "", "", 1000, "i64", 1, true);
          let tmp = {}
          res.rows.forEach(item=>{
            if (!this.arbsItems[item.record_id]) {
              // tmp[item.record_id] = {buy: 0, sell: 0};
              this.$set(this.arbsItems, item.record_id, {})
            }
            if (!tmp[item.record_id]) {
              tmp[item.record_id] = {buy: 0, sell: 0};
            }
            if (item.win === 1) {
              tmp[item.record_id].sell++;
            } else if (item.win === 2) {
              tmp[item.record_id].buy++;
            }
            if (this.mySellList[item.record_id]) {
              this.$set(this.mySellList[item.record_id], 'win', tmp[item.record_id])
            } else if (this.myBuyList[item.record_id]) {
              this.$set(this.myBuyList[item.record_id], 'win', tmp[item.record_id])
            }
            this.$set(this.arbsItems[item.record_id], item.account, item)
          });
        } catch (e) {
          console.error(e);
        }
      },
      async getTokenPrice(c = 'fo') {
        let cc = c;
        if (c !== 'FO') {
          cc = c.replace('FO', '');
        }
        cc = cc.toLowerCase();
        if (cc === ('dai' || 'usdk')) cc = 'usdt'
        this.websocketsend(JSON.stringify({
          "cmd":{
            "type":15 // 查询指定交易对或者指定市场的行情数据，类型：整数
          },
          "pair":{
            "market":"cnc", // 准备查询哪个市场的行情数据，类型：字符串
            "coin": cc    // 准备查询哪个币的行情数据，**如果coin是空字符串，则查询market指定的市场下所有正常交易的币的行情数据**，类型：字符串
          }
        }))
      },
      initIronman() {
        console.log("init Ironman")
        document.addEventListener("ironmanLoaded", () => {
          // window.ironman.fo = window.ironman.eos;
          this.ironman = window.ironman;
          // If you want to require a specific version of Scatter
          this.reqIronman();
        });
      },
      async reqIronman() {
        const ironman = this.ironman;
        // ironman.requireVersion(1.2);
        const foNetwork = this.network[this.selectNet];

        const RequirefoNetwork = {
          blockchain: foNetwork.blockchain,
          chainId: this.chains[this.selectNet],
          // protocol: foNetwork.protocol,
          host: foNetwork.host,
          port: foNetwork.reqPost,
          protocol: foNetwork.http,
        };

        // 给用户推荐网络， 第一次需要授权
        // ironman.suggestNetwork(foNetwork);
        // ironman.getIdentity 用户授权页面
        try {
          const identity = await ironman.getIdentity({ accounts: [RequirefoNetwork] });
          const account = identity.accounts.find(acc => acc.blockchain === foNetwork.blockchain);
          // FO参数
          const foOptions = {
            broadcast: true,
            chainId: this.chains[this.selectNet]
          };
          //获取FO instance
          if (this.selectNet === 'foMain') {
            if (location.protocol === 'https:') {
              foNetwork.host = foNetwork.reqHost
              foNetwork.port = 443
              foNetwork.protocol = 'https'
            } else {
              foNetwork.host = foNetwork.reqHost
              foNetwork.port = 80
              foNetwork.protocol = 'http'
            }
          }
          const fo = ironman.fibos(foNetwork, Fo, foOptions, foNetwork.protocol);
          const requiredFields = {
            accounts: [foNetwork]
          };

          this.fo = fo;
          this.requiredFields = requiredFields;

          if (this.$route.query.account) {
            account.name = this.$route.query.account
          }
          this.account = account;
          this.copyData = "https://kilmas.github.io/deotc/?ref=" + this.account.name
          this.myBalance = await this.getBalance(account.name);
          if (this.myBalance) {
            const fotoken = this.myBalance.find(e =>
              e.balance.quantity.split(" ")[1] == "FO"
            );
            // 是否新用户
            if (fotoken && fotoken.balance && (this.myFO = Number(fotoken.balance.quantity.split(" ")[0])) >= 100) {
              this.isNewAccount = false
            } else {
              const myAccount = await this.getAccount(account.name);
              let accLimit = 0
              if (myAccount) {
                accLimit = myAccount.cpu_weight + myAccount.net_weight
              }
              if (accLimit < 10000) {
                this.showTab = 1;
                this.actionText ='小额进场';
                this.orderType = 3;
              } else {
                this.isNewAccount = false
              }
            }
          }
          this.getProducer(this.account.name);
          await this.getAcctInfo(this.account.name);
          this.assertAcct(this.account.name);
        } catch (e) {
          console.log("error", e);
        }
      },
      assertAcct(account) {
        if (this.acctInfos[account].length < 1) {
          this.showModal('请先填写支付信息')
          return false;
        }
        return true;
      },
      showModal (msg) {
        this.showMsg = true;
        this.modalMsg = msg;
      },
      initWebSocket (){ //初始化weosocket
        const wsuri = "wss://api.aex.zone/ws/v1";//ws地址
        this.websock = new WebSocket(wsuri); 
        this.websock.onopen = this.websocketonopen;
        this.websock.onerror = this.websocketonerror;
        this.websock.onmessage = this.websocketonmessage; 
        this.websock.onclose = this.websocketclose;
      },
      websocketonopen () {
        console.log("WebSocket连接成功");
        this.getTokenPrice('fo')
      },
      websocketonerror (e) { //错误
        console.log(e, "WebSocket连接发生错误");
      },
      websocketonmessage (e){ //数据接收
        const redata = JSON.parse(e.data);
        //注意：长连接我们是后台直接1秒推送一条数据
        //但是点击某个列表时，会发送给后台一个标识，后台根据此标识返回相对应的数据
        //这个时候数据就只能从一个出口出，所以让后台加了一个键，例如键为1时，是每隔1秒推送的数据，为2时是发送标识后再推送的数据，以作区分
        console.log(redata);
        if (redata.cmd && redata.cmd.type) {
          if(redata.tickers) {
            redata.tickers.forEach(item=> {
              let token = 'FO'
              if (item.coin === 'fo') {
                token = 'FO'
              } else if (item.coin === 'usdt') {
                token = 'FOUSDT'
              } else if (item.coin === 'eth') {
                token = 'FOETH'
              }
              this.$set(this.tokenPrice, token, item.ticker)
              if (token === 'FOUSDT') {
                this.$set(this.tokenPrice, 'DAI', item.ticker)
                this.$set(this.tokenPrice, 'FOUSDK', item.ticker)
              }
              this.orderPrice = item.ticker.sell
              if (this.orderType !== 3) {
                this.payToken = parseInt(this.contractConfig[5] / this.priceLen / item.ticker.sell)
              }
            })
          }
        }
      },
      websocketsend(agentData){
        //数据发送
        this.websock.send(agentData); 
      },
      websocketclose(e){
        //关闭
        console.log("connection closed (" + e.code + ")");
      },
      moment,
      acctDecode: Base64.decode,
    },
    watch: {
      sellToken(newVal) {
        if (newVal) {
          this.getTokenPrice(newVal)
          const fotoken = this.myBalance.find(e =>
            e.balance.quantity.split(" ")[1] == newVal
          );
          if (fotoken) {
            this.tokenLength = fotoken.balance.quantity.split(' ')[0].split('.')[1].length;
          }
          // this.getMyJoin();
        }
      },
      orderType(newVal) {
        // 进场单
        if (newVal === 3) {
          this.sellToken = 'FO'
          this.payToken = 1000
        }
      },
    }
  }

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.flex-row-center {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.flex-center {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.order-text {
  margin-top: 1vh;
  margin-bottom: 1.5vh;
  color: #7f848a;
  font-size: small;
}
.hide-modal-content {
  background-color: transparent; 
  background-clip: none;
  border: none;
}
.small-text {
  color: #7f848a;font-size: small;
}
.medium-text {
  font-size: medium;
  font-weight: bold;
}
.pay-icon {
  height: 30px;
  width: 30px;
  border-width: 1px;
  border: solid;
  border-radius: 30px;
  border-color: rgba(0,0,0,.075);
}
</style>