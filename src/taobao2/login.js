const puppeteer = require('puppeteer');
const { loginSlider, isLoginSlider } = require('./loginSlider');
const oldMysellUrl = "https://myseller.taobao.com/home.htm#/index"
const newMysellUrl = "https://myseller.taobao.com/home.htm/QnworkbenchHome"
const loginUrl = "https://login.taobao.com/member/login.jhtml?redirectURL=https://myseller.taobao.com"
const mysellBaseUrl = "https://myseller.taobao.com/home.htm"
const fahuoUrl = "https://fahuo.cainiao.com/consigns/order/ggSend.htm"
// 登录 
const login = async (shopInfos) => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1600, height: 1000 },
    slowMo: 200,
    ignoreDefaultArgs: [
      '--disable-infobars',
      '--enable-automation',
      'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    ],
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled',],
    dumpio: false,
  });
  const page = await browser.newPage();
  await page.goto(loginUrl);
  while(true){
    await page.waitForTimeout(2000)
    const url = await page.url()
    if (url.includes(mysellBaseUrl)) {
      break;
    }
  }
  await page.waitForTimeout(2000)
  await isLoginSlider(page)
  await page.waitForTimeout(2000)
  const curUrl= await page.url()
  if(curUrl == oldMysellUrl){
    const newBtn = await page.$(".qn-header-new-btn")
    newBtn.click();
    await page.waitForTimeout(5000)
  }
  await isLoginSlider(page)
  await page.goto(newMysellUrl)
  await page.waitForTimeout(2000)
  const mysellerCookie = await page.cookies();
  const shopName = await page.$eval(".UserArea--shopName--3Z5NVbD",e=>e.innerText)
  let shopInfo = null;
  shopInfos.forEach(shop => {
    if(shop.name === shopName){
      shopInfo = shop
    }
  });
  if(!shopInfo) return;

  await page.waitForTimeout(2000)
  await page.goto(fahuoUrl);
  const fahuoCookie = await page.cookies();
  await page.waitForTimeout(2000)
  let data = {
    mysellerCookie,
    fahuoCookie,
    isOnline:true,
    updateAt:(new Date()).toLocaleString(),
    fahuox5sec:"",
    wuliux5sec:"",
    id:shopInfo.id
  }
  let storeShopNames = global.shopStore.get("shopNames")
  if(storeShopNames && (!storeShopNames.includes(shopName))){
    storeShopNames = [...storeShopNames,shopName]
  }else {
    storeShopNames = [shopName]
  }
  global.shopStore.put("shopNames",storeShopNames)
  global.shopStore.put(shopName,data)
  browser.close();
  return true;
}

module.exports = {
  login
}
