<template>
  <div>
    <b-navbar toggleable="md">
      <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>
      <b-navbar-brand href="#">BLOCKCHAIN CTC</b-navbar-brand>
      <b-navbar-brand>
        <span class="fa fa-share" v-clipboard:copy="copyData" v-clipboard:success="onCopy" v-clipboard:error="onError"></span>
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
              <em>{{ account.name ? account.name : '' }}</em>
            </template>
            <b-dropdown-item @click.prevent="signout">Sign out</b-dropdown-item>
          </b-nav-item-dropdown>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <main class="column">
      <div class="m-1">
        <b-alert :show="accountID !== ''">你的合约ID: {{accountID}}</b-alert>     
        <div class="mb-4" v-if="accountID === ''">
          <b-alert show>你未设置合约ID，请先设置合约ID再转账</b-alert>
          <b-button variant="primary" @click="setid">设置转账ID</b-button>
        </div>
        <b-alert show>FO合约余额: {{ fousdt.balance.quantity }}, 内部转账金额请小于合约余额，合约可自动转账</b-alert>
        <b-alert show variant="primary">转账到okex内部账号:wallet@qingah.com</b-alert>
        <div class="flex-center mb-2">
          <b-button variant="outline-primary" v-clipboard:copy="copyAccount" v-clipboard:success="onCopyAccount" v-clipboard:error="onError">复制该账号</b-button>
        </div>
        <b-alert show variant="danger">转账金额小数点后为你的合约FO账号ID，需要点击下面设置按钮写入合约，okex内部转账务必确认小数点后面id数，否则自动转账无法生效</b-alert>
      </div>
      <div class="m-2">
        <b-input-group size="md" prepend="$">
          <b-form-input v-model="defaultValue"></b-form-input>
          <b-input-group-append>
            <b-button size="sm" variant="danger" v-clipboard:copy="copyID" v-clipboard:success="onCopyID" v-clipboard:error="onError">.{{ accountID }}</b-button>
            <b-button size="sm" variant="primary" v-clipboard:copy="copyAmount" v-clipboard:success="onCopyAmount" v-clipboard:error="onError">复制金额</b-button>
          </b-input-group-append>
        </b-input-group>
      </div>

      <b-alert show variant="primary">直接波场USDT由转账到你的TRC-20地址,收取手续费0.1USDT</b-alert>
      <b-alert show>波场账号余额: {{ fousdt.balance.quantity }}, 如需及时到账账金额请小于该余额，可自动转账</b-alert>
      <div class="m-2">
        <b-input-group size="md">
          <b-form-input v-model="withdrawAmount" type="number" min="10.000000" placeholder="提现金额"></b-form-input>
          <b-input-group-append>
            <b-form-select v-model="selected" :options="tokens" size="sm h-100"></b-form-select>
          </b-input-group-append>
        </b-input-group>
        <b-input-group class="mt-2" size="md" append="">
          <b-form-input v-model="cexAccount" placeholder="你的交易所波场充值USDT地址或者波场地址(TRC-20地址/T开头"></b-form-input>
          <b-input-group-append>
            <b-button size="sm" variant="primary" @click="withdraw">提现</b-button>
          </b-input-group-append>
        </b-input-group>
      </div>
    </main>
    <b-modal v-model="tranHash" centered hide-header hide-footer>
      <div :class="tranText">{{ tranMsg }}</div>
    </b-modal>
    <b-modal id="bv-modal-example" centered hide-footer hide-header v-model="showMsg">
      <div class="d-block text-center">
        <h3>{{ modalMsg }}</h3>
      </div>
      <b-button
        class="mt-3"
        block
        @click="
          showMsg = false
          showTemp = 2
        "
        >确定</b-button
      >
    </b-modal>
    <b-modal v-model="buttonSpiner" centered hide-footer hide-header-close hide-header no-close-on-backdrop hide-backdrop content-class="hide-modal-content">
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
import forge from 'node-forge'
Vue.use(VueQriously)
// import VueQArt from 'vue-qart'
Vue.use(VueClipboard)
const moment = require('moment')
const Base64 = require('js-base64').Base64

const foMainChain = '6aa7bd33b6b45192465afa3553dedb531acaaff8928cf64b70bd4c5e49b7ec6a'
const foTestChain = '68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a'

const CONTRACT = 'foaccountids'
const rsaPublicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDtf6zwW78U3O1SkqqPnrPWt1rn
ab+odxzSOV8wom1dT6j9ccj9wwoNO6E5MwsjWQjH4F7uLIFoZvSOtllxROGkbMqb
MmbdNLJHDNXBLhUfS8rJHowyc8XxZrvFgCA+B2JkCJpsD0bo3VPCHwwKKijzfZOm
aUmbIk/O6hZpgEwiMQIDAQAB
-----END PUBLIC KEY-----`

const pKeyEncrypt = forge.pki.publicKeyFromPem(rsaPublicKey)

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
      contractName: CONTRACT,
      fousdt: {
        balance: {
          quantity: '',
        },
      },
      defaultValue: 10,
      priceFix: 4,
      priceLen: 10000, // 以厘为单位
      showTab: 1,
      tabTokens: {'FO': 4, 'FOUSDT':6, 'FODAI':8, 'FOETH':8, 'FOUSDK': 6},
      selectToken: 'FO',
      sellToken: 'FO',
      orderType: 1,
      showTemp: 1,
      account: {},
      ruleShow: false,
      tranHash: false,
      tranMsg: '',
      tranText: 'text-success',
      tokens: [
        { text: 'FOUSDT', value: 'FOUSDT' },
        // { text: 'FO', value: 'FO' },
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
      copyData: 'https://ctc.qingah.com',
      copyAmount: "1",
      copyAccount: "wallet@qingah.com",
      actionText: '我要买',
      isNewAccount: true,
      payAccount: '',
      orderPrice: 1,
      myBalance: [],
      payToken: 1000,
      tokenLength: 4,
      player: {},
      players: [],
      selectItem: null,
      buttonSpiner: false,
      myFO: 0,
      showToken: 'TOKEN',
      arbAcct: null,
      showMsg: false,
      modalMsg: '',
      qrImg: null,
      resultCode: null,
      accountID: '',
      copyID: '',
      withdrawAmount: "10.000000",
      cexAccount: '',
      selected: 'FOUSDT'
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
        const foAccount = await this.getAccountID(this.account.name)
        if (foAccount) {
          this.tranModal(true, `已设置,id=${this.accountID}`, 'text-warning')
        } else {
          const contract = await this.fo.contract(CONTRACT, {
            requiredFields: this.requiredFields,
          })
          const trx = await contract.setid(this.account.name, {
            authorization: `${this.account.name}@active`,
          })
          setTimeout(() => {
            this.getAccountID(this.account.name)
          }, 1000)
          console.log(trx)
          this.tranModal(true, '设置成功', 'text-success')
        }
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
    async withdraw() {
      this.buttonSpiner = true
      if (!this.cexAccount) {
        this.tranModal(true, '请输入okex账号', 'text-danger')
        return
      }
      const memo = pKeyEncrypt.encrypt(this.cexAccount.trim(), 'RSA-OAEP')

      try {
        const trx = await this.fo.transfer(this.account.name, CONTRACT, `${(Number(this.withdrawAmount) + 0.1).toFixed(this.tabTokens[this.selected])} ${this.selected}`, btoa(memo))
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
    onCopy(e) {
      if (e.action === 'copy') {
        this.tranModal(true, '复制成功：' + e.text, 'text-success')
      }
    },
    onCopyID(e) {
      if (e.action === 'copy') {
        this.tranModal(true, '复制成功：' + e.text, 'text-success')
      }
    },
    onCopyAccount(e) {
      if (e.action === 'copy') {
        this.tranModal(true, '复制成功：' + e.text, 'text-success')
      }
    },
    onCopyAmount(e) {
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
    async getAccountID(account) {
      try {
        const res = await this.fo.getTableRows(true, CONTRACT, CONTRACT, 'idtbs', 'account', account, account, 1, 'i64', 2, true)
        if (res.rows && res.rows[0] && res.rows[0].id) {
          this.accountID = `${res.rows[0].id}`.padStart(8, '0')
          this.copyID = `.${this.accountID}`
        }
        return res.rows[0]
      } catch (e) {
        console.error(e)
      }
      return null
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
        host: foNetwork.host,
        port: foNetwork.reqPost,
        protocol: foNetwork.http,
      }

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
        this.contractBalance = await this.getBalance(CONTRACT)
        if (this.contractBalance) {
          const fousdt = this.contractBalance.find(e => e.balance.quantity.split(' ')[1] == 'FOUSDT')
          if (fousdt) {
            this.fousdt = fousdt
          }
        }
        await this.getAccountID(this.account.name)
        this.copyAmount = `10.${this.accountID}`
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
  watch: {
    defaultValue(newVal) {
      if (newVal) {
        this.copyAmount = `${newVal}.${this.accountID}`
      }
    },
  },
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
</style>
