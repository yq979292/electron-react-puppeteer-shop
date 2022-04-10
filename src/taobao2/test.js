// 获取店铺订单
const puppeteer = require('puppeteer');
const { order } = require('../taobao/cainiao');
const { isBig } = require('./compareDate');
const {
  installMouseHelper
} = require('./install-mouse-helper');
const { slider } = require('./slider');


// 所有的订单编号
let totalNos = [];
// 所有订单信息 
let totalOrders = [];


const taobaoUrl = "https://www.taobao.com/";
const baseMysellUrl = "https://myseller.taobao.com/home.htm"
const oldMysellUrl = "https://myseller.taobao.com/home.htm#/index"
const newMysellUrl = "https://myseller.taobao.com/home.htm/QnworkbenchHome"
const loginMysellUrl = "https://loginmyseller.taobao.com";
const orderMysellUrl = "https://myseller.taobao.com/home.htm/batch-consign";
const fahuoUrl = "https://fahuo.cainiao.com/consigns/order/ggSend.htm"


let browser = null;
let page = null;
const getBrowser = async()=>{
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {width: 1459,height: 872},
    slowMo: 200,
    ignoreDefaultArgs: [
        '--disable-infobars',
        '--enable-automation',
        'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    ],
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', ],
    dumpio: false,
  });
  return browser;
}

const getPage = async(browser,cookies)=>{
  const page = await browser.newPage();
  await installMouseHelper(page); //调试鼠标轨迹专用
  cookies.forEach(cook => {
    page.setCookie(cook)
  });
  await page.goto(taobaoUrl)
  await page.waitForTimeout(1000)
  await page.goto(baseMysellUrl)
  await page.waitForTimeout(1000)
  await page.goto(fahuoUrl)
  await page.waitForTimeout(2000)
  return page
}


// 获取店铺订单
const test = async()=>{
  const shopInfo = global.shopStore.get("艾芙俪玟家居")
  let mysellercookies = shopInfo.mysellerCookie;
  let fahuocookies = shopInfo.fahuoCookie;
  if(!mysellercookies || !fahuocookies) {
    return {code:0,msg:"重新登录试试"};
  }
  browser = await getBrowser();
  page = await getPage(browser,mysellercookies)
}


module.exports = {test}
