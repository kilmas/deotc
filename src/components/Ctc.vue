<template>
  <div>
    <b-navbar toggleable="md">
      <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
      <b-navbar-brand href="#">BLOCKCHAIN CTC</b-navbar-brand>
      <b-navbar-brand>
        <span
          class="fa fa-share"
          v-clipboard:copy="copyData"
          v-clipboard:success="onCopy"
          v-clipboard:error="onError"
        ></span>
      </b-navbar-brand>
      <b-collapse is-nav id="nav_collapse">
        <b-navbar-nav>
          <b-nav-item @click.prevent="showRule">Rule</b-nav-item>
        </b-navbar-nav>
        <b-navbar-nav class="ml-auto">
          <b-nav-item-dropdown text="Lang" right>
            <b-dropdown-item href="#">EN</b-dropdown-item>
            <b-dropdown-item href="#">CN</b-dropdown-item>
          </b-nav-item-dropdown>
          <b-nav-item-dropdown right v-if="account.name">
            <!-- Using button-content slot -->
            <template slot="button-content">
              <em>{{account.name ? (account.name) : ''}}</em>
            </template>
            <b-dropdown-item @click.prevent="signout">Sign out</b-dropdown-item>
          </b-nav-item-dropdown>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <main class="column">
      <b-button size="lg" class="mr-2" @click="setid">设置收款id</b-button>
    </main>
    <b-modal v-model="tranHash" centered hide-header hide-footer>
      <div :class="tranText">{{tranMsg}}</div>
    </b-modal>
    <b-modal id="bv-modal-example" centered hide-footer hide-header v-model="showMsg">
      <div class="d-block text-center">
        <h3>{{modalMsg}}</h3>
      </div>
      <b-button class="mt-3" block @click="showMsg=false;showTemp=2;">确定</b-button>
    </b-modal>
    <b-modal
      v-model="buttonSpiner"
      centered
      hide-footer
      hide-header-close
      hide-header
      no-close-on-backdrop
      hide-backdrop
      content-class="hide-modal-content"
    >
      <div class="text-center">
        <b-spinner large />
      </div>
    </b-modal>
    <b-modal v-model="ruleShow" @ok="handleOk" centered>
      <b-list-group class="text-danger">
        <b-list-group-item>1.设置账号收款id</b-list-group-item>
        <b-list-group-item>2.okex 内部转账.${id}</b-list-group-item>
      </b-list-group>
    </b-modal>
  </div>
</template>

<script>
// import axios from "axios";
const Fo = require('fibos.js')

import Vue from 'vue'
import VueClipboard from 'vue-clipboard2'
import VueQriously from 'vue-qriously'
Vue.use(VueQriously)
// import VueQArt from 'vue-qart'
Vue.use(VueClipboard)
const moment = require('moment')
const Base64 = require('js-base64').Base64

const items = []


const foMainChain = '6aa7bd33b6b45192465afa3553dedb531acaaff8928cf64b70bd4c5e49b7ec6a'
const foTestChain = '68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a'

const CONTRACT = 'foaccountids'

export default {
  name: CONTRACT,
  mounted() {
    document.title = 'FO CTC'
    if (this.$route.query.debug == 'fo') {
      this.selectNet = 'foTest'
    }
    const foNetwork = this.network[this.selectNet]
    this.fo = Fo({
      chainId: this.chains[this.selectNet],
      httpEndpoint: `${location.protocol}//${foNetwork.reqHost}:${location.protocol === 'http:' ? foNetwork.port : foNetwork.reqPost}`,
    })
    this.initIronman()
    if (!localStorage.getItem('showRule')) {
      this.ruleShow = true
      localStorage.setItem('showRule', 1)
    }
  },
  computed: {},
  created() {
    //页面刚进入时开启长连接
  },
  destroyed() {
    //页面销毁时关闭长连接
  },
  data() {
    return {
      priceFix: 4,
      priceLen: 10000, // 以厘为单位
      arbGroups: [],
      showTab: 1,
      tabIndex: 0,
      tabIndex2: 0,
      tabTokens: ['FO', 'FOUSDT', 'FODAI', 'FOETH', 'FOUSDK'],
      selectToken: 'FO',
      sellToken: 'FO',
      orderType: 1,
      sellAccount: 0,
      showTemp: 1,
      account: {},
      items: items,
      ruleShow: false,
      tranHash: false,
      tranMsg: '',
      tranText: 'text-success',
      tokens: [
        { text: 'FOUSDT', value: 'FOUSDT' },
        { text: 'FO', value: 'FO' },
        { text: 'FODAI', value: 'FODAI' },
        { text: 'FOETH', value: 'FOETH' },
        { text: 'FOUSDK', value: 'FOUSDK' },
      ],
      selectNet: 'foMain',
      chains: {
        foTest: foTestChain,
        foMain: foMainChain,
      },
      network: {
        foTest: {
          name: 'FO test',
          protocol: 'http',
          port: 80,
          reqPost: 80,
          host: 'api.testnet.fo',
          reqHost: 'api.testnet.fo',
          blockchain: 'fibos',
          chainId: foTestChain,
          backupServer: '',
          http: 'http',
          ticketUrl: '',
        },
        foMain: {
          name: 'FIBOS Mainnet',
          protocol: 'http',
          reqPost: 443,
          blockchain: 'fibos',
          chainId: foMainChain,
          host: 'to-rpc.fibos.io',
          reqHost: 'rpc-mainnet.bitewd.com',
          port: 8870,
          backupServer: '',
          http: 'http',
          ticketUrl: 'https://api.aex.plus',
        },
      },
      copyData: '',
      actionText: '我要买',
      isNewAccount: true,
      payAccount: '',
      orderPrice: 1,
      myBalance: [],
      payToken: 1000,
      tokenLength: 4,
      player: {},
      players: [],
      acctInfos: {},
      selectItem: null,
      buttonSpiner: false,
      tokenPrice: {},
      websock: null,
      arbList: {},
      arbsItems: {},
      myFO: 0,
      showToken: 'TOKEN',
      arbAcct: null,
      showMsg: false,
      modalMsg: '',
      qrImg: null,
      resultCode: null,
    }
  },
  methods: {
    qrAccount(item) {
      return item.type === 2 ? item.buyer : item.seller
    },
    handleOk() {},
    async onDetect(promise) {
      try {
        const {
          imageData, // raw image data of image/frame
          content, // decoded String or null
          location, // QR code coordinates or null
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
    onDecode(result) {
      this.resultCode = result
    },
    tranModal(show, msg, text) {
      if (msg) {
        this.tranMsg = msg
      }
      if (text) {
        this.tranText = text
      }
      this.tranHash = show
    },
    async setid() {
      // 执行智能合约
      this.buttonSpiner = true
      try {
        const contract = await this.fo.contract(CONTRACT, {
          requiredFields: this.requiredFields,
        })
        const trx = await contract.setid(this.account.name, {
          authorization: `${this.account.name}@active`,
        })
        console.log(trx)
        this.tranModal(true, '设置成功', 'text-success')
      } catch (e) {
        console.log('error', e)
        this.tranModal(true, '设置失败', 'text-danger')
      }
      this.buttonSpiner = false
    },
    async updateOrder() {
      // 更改价格
      this.buttonSpiner = true
      try {
        const contract = await this.fo.contract(CONTRACT, {
          requiredFields: this.requiredFields,
        })
        const trx = await contract.updateorder(this.selectItem.id, parseInt(this.orderPrice * this.priceLen), {
          authorization: `${this.account.name}@active`,
        })
        console.log(trx)
        this.selectItem.price = Number(this.orderPrice) * this.priceLen
        this.$set(this.mySellList, this.selectItem.id, this.selectItem)
        this.tranModal(true, '更新成功', 'text-success')
      } catch (e) {
        console.error('error', e)
        this.tranModal(true, '更新失败', 'text-danger')
      }
      this.buttonSpiner = false
    },
    async cancelOrder(item) {
      this.buttonSpiner = true
      try {
        const contract = await this.fo.contract(CONTRACT, {
          requiredFields: this.requiredFields,
        })
        const trx = await contract.cancelorder(item.id, {
          authorization: `${this.account.name}@active`,
        })
        if (item.buyer === this.account.name) {
          this.$delete(this.myBuyList, item.id)
        } else if (item.seller === this.account.name) {
          this.$delete(this.mySellList, item.id)
        }
        this.tranModal(true, '取消成功', 'text-success')
        console.log(trx)
      } catch (e) {
        console.log('error', e)
        this.tranModal(true, '取消失败', 'text-danger')
      }
      this.buttonSpiner = false
    },
    async resultOrder(item) {
      this.buttonSpiner = true
      try {
        const contract = await this.fo.contract(CONTRACT, {
          requiredFields: this.requiredFields,
        })
        const trx = await contract.result(item.id, {
          authorization: `${this.account.name}@active`,
        })
        if (item.buyer === this.account.name) {
          this.$delete(this.myBuyList, item.id)
        } else if (item.seller === this.account.name) {
          this.$delete(this.mySellList, item.id)
        }
        this.tranModal(true, '确认成功，订单转账成功！', 'text-success')
        console.log(trx)
      } catch (e) {
        console.error('error', e)
        this.tranModal(true, '确认失败！', 'text-danger')
      }
      this.buttonSpiner = false
    },
    accountReset() {},
    invite() {
      this.modal = true
      this.modalMsg = '复制成功：' + this.copyData
    },
    async transferToken(item) {
      if (item.type == 1) {
        this.buyToken(item)
      } else if (item.type == 2) {
        if (!this.assertAcct(this.account.name)) return
        this.buttonSpiner = true
        let payToken = item.buy_pay
        // 以厘为单位
        let message = `4,${item.id}`
        // 执行智能合约
        try {
          const contract = await this.fo.contract('eosio.token', {
            requiredFields: this.requiredFields,
          })
          const trx = await contract.transfer(this.account.name, CONTRACT, payToken, message)
          console.log(trx)
          this.tranModal(true, '提交成功', 'text-success')
          this.getRecords()
        } catch (e) {
          console.error('error', e)
          this.tranModal(true, '提交失败', 'text-danger')
        }
        this.buttonSpiner = false
      }
    },
    onCopy(e) {
      console.log(e)
      if (e.action === 'copy') {
        this.tranModal(true, '复制成功：' + e.text, 'text-success')
      }
    },
    onError(e) {
      console.log(e)
    },
    Invest() {
      this.modal = true
      this.modalMsg = '复制成功：' + this.copyData
    },
    async getAccount(account = CONTRACT) {
      let token
      try {
        token = await this.fo.getAccount(account)
      } catch (e) {
        return null
      }
      return token
    },
    async getBalance(account = CONTRACT) {
      let token
      try {
        token = await this.fo.getTableRows(true, 'eosio.token', account, 'accounts', 'primary', 0, 100, 100)
      } catch (e) {
        return null
      }
      return token.rows
    },
    async getAcctInfo(account) {
      let res
      try {
        res = await this.fo.getTableRows(true, CONTRACT, account, 'userinfos')
        this.$set(this.acctInfos, account, {})
        res.rows.forEach(item => {
          this.$set(this.acctInfos[account], item.id, item)
        })
      } catch (e) {
        return null
      }
      return res.rows
    },
    login() {
      this.reqIronman()
    },
    signout() {
      this.account = {}
      this.ironman.forgetIdentity(this.ironman.identity)
    },
    showRule() {
      this.ruleShow = true
    },
    myOrders() {
      if (this.account.name) {
        this.showTab = 2
      }
    },
    async getRecords() {
      try {
        const res = await this.fo.getTableRows(true, CONTRACT, CONTRACT, 'records', '', '', '', 1000, 'i64', 1, true)
        console.log(res)
      } catch (e) {
        console.error(e)
      }
    },
    initIronman() {
      console.log('init Ironman')
      document.addEventListener('ironmanLoaded', () => {
        // window.ironman.fo = window.ironman.eos;
        this.ironman = window.ironman
        // If you want to require a specific version of Scatter
        this.reqIronman()
      })
    },
    async reqIronman() {
      const ironman = this.ironman
      // ironman.requireVersion(1.2);
      const foNetwork = this.network[this.selectNet]

      const RequirefoNetwork = {
        blockchain: foNetwork.blockchain,
        chainId: this.chains[this.selectNet],
        // protocol: foNetwork.protocol,
        host: foNetwork.host,
        port: foNetwork.reqPost,
        protocol: foNetwork.http,
      }

      // 给用户推荐网络， 第一次需要授权
      // ironman.suggestNetwork(foNetwork);
      // ironman.getIdentity 用户授权页面
      try {
        const identity = await ironman.getIdentity({ accounts: [RequirefoNetwork] })
        const account = identity.accounts.find(acc => acc.blockchain === foNetwork.blockchain)
        // FO参数
        const foOptions = {
          broadcast: true,
          chainId: this.chains[this.selectNet],
        }
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
        const fo = ironman.fibos(foNetwork, Fo, foOptions, foNetwork.protocol)
        const requiredFields = {
          accounts: [foNetwork],
        }

        this.fo = fo
        this.requiredFields = requiredFields

        if (this.$route.query.account) {
          account.name = this.$route.query.account
        }
        this.account = account
        this.copyData = 'https://deotc.qingah.com/?ref=' + this.account.name
        this.myBalance = await this.getBalance(account.name)
        if (this.myBalance) {
          const fotoken = this.myBalance.find(e => e.balance.quantity.split(' ')[1] == 'FO')
          // 是否新用户
          if (fotoken && fotoken.balance && (this.myFO = Number(fotoken.balance.quantity.split(' ')[0])) >= 100) {
            this.isNewAccount = false
          } else {
            const myAccount = await this.getAccount(account.name)
            let accLimit = 0
            if (myAccount) {
              accLimit = myAccount.cpu_weight + myAccount.net_weight
            }
            if (accLimit < 10000) {
              this.showTab = 1
              this.actionText = '小额进场'
              this.orderType = 3
            } else {
              this.isNewAccount = false
            }
          }
        }
      } catch (e) {
        console.log('error', e)
      }
    },
    showModal(msg) {
      this.showMsg = true
      this.modalMsg = msg
    },
    moment,
    acctDecode: Base64.decode,
  },
  watch: {},
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
  color: #7f848a;
  font-size: small;
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
  border-color: rgba(0, 0, 0, 0.075);
}
</style>