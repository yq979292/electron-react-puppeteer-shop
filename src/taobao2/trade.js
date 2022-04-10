// 获取店铺订单
const puppeteer = require('puppeteer');
const {
  installMouseHelper
} = require('./install-mouse-helper');
const { slider } = require('./slider');

const tradeUrl = "https://trade.taobao.com/trade/detail/tradeSnap.htm?snapShot=true&tradeID="
const taobaoUrl = "https://www.taobao.com/";
const baseMysellUrl = "https://myseller.taobao.com/home.htm"
const loginMysellUrl = "https://loginmyseller.taobao.com";

let browser = null;
let page = null;
let curShopName = "";
let curTradeIds = []
let totalTrades = {};
const getBrowser = async()=>{
  const browser = await puppeteer.launch({
    headless: true,
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
  await page.waitForTimeout(2000)
  return page
}

// 获取店铺订单
const trade = async(shopName,tradeIds)=>{
  curShopName = shopName
  curTradeIds = tradeIds
  const shopInfo = global.shopStore.get(shopName)
  let cookies = shopInfo.mysellerCookie;
  if(!cookies) {
    browser.close()
    return {code:0,msg:"没有cookie"};
  }
  browser = await getBrowser();
  if(shopInfo.wuliux5sec){
    cookies = [...cookies,shopInfo.wuliux5sec]    
  }
  page = await getPage(browser,cookies)
  let curUrl = await page.url();
  if(curUrl.includes(loginMysellUrl)){// 重新登录
    shopInfo.isOnline = false;
    shopInfo.fahuox5sec = "";
    shopInfo.wuliux5sec = "";
    global.shopStore.put(shopName,shopInfo)
    browser.close()
    return {code:0,msg:"cookie失效"};
  }
  // 获取产品编号
  await getTradeInfo(page)
  return {code:1,msg:"trade获取成功",data:totalTrades};
}

const getTradeInfo = async(page)=>{
  for(let i=0;i<curTradeIds.length;i++){
    let curTradeId = curTradeIds[i]
    await page.goto(`${tradeUrl}${curTradeId}`)
    await page.waitForTimeout(1000)
    const id = await page.$eval(".value-inline",e=>e.innerText)
    totalTrades[curTradeId] = id
  }
} 

module.exports = {trade}
