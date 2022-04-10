// 获取店铺订单
const puppeteer = require('puppeteer');
const { order } = require('../taobao/cainiao');
const { isBig } = require('./compareDate');
const {
  installMouseHelper
} = require('./install-mouse-helper');
const { slider } = require('./slider');



const taobaoUrl = "https://www.taobao.com/";
const baseMysellUrl = "https://myseller.taobao.com/home.htm"
const wuliuUrl = "https://wuliu.taobao.com/user/order_list_new.htm?order_status_show=send"

let browser = null;
let page = null;
let noMemoDic = {};
let dwonUrlAndnoArr = [];
let expressDic = {};
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
const fahuoinsert = async(shopName,express)=>{
  try{
    expressDic = express
    const shopInfo = global.shopStore.get(shopName)
    let cookies = shopInfo.mysellerCookie;
    if(!cookies) return {code:0,msg:"没有cookie"};
    browser = await getBrowser();
    if(shopInfo.wuliux5sec){
      cookies = [...cookies,shopInfo.wuliux5sec]    
    }
    page = await getPage(browser,cookies)
    await insertWuliu(page,shopInfo,shopName)
  }catch(e){
    browser.close()
    console.log(e)
    return {code:0,msg:"发货失败"}
  }
  browser.close()
  return {code:1,msg:"发货成功"}
}

const insertWuliu = async(page,shopInfo,shopName)=>{
  await page.goto(wuliuUrl)
  await page.waitForTimeout(1000)
  let isSlider = await slider(page,shopName)
  if(isSlider){
    return await insertWuliu(page,shopInfo,shopName)
  }
  await page.waitForTimeout(5*1000)
  const coloseBtn = await page.$(".src-components-entries-widget-Ball-index-module__close--201P8")
  coloseBtn && coloseBtn.click()
  while(true){
    await page.waitForTimeout(5*1000)
    const tables = await page.$$(".j_expressTbody")
    let isOver = false;
    for(let i=0;i<tables.length;i++){
        const table = tables[i]
        let no = await table.$eval(".order-number",e=>e.innerText)
        no = no.replace(/订单编号：/g,"")
        if(expressDic[no]){
            let downUrl = await table.$eval(".btn",e=>e.getAttribute('href'))
            dwonUrlAndnoArr = [...dwonUrlAndnoArr,{url:"https:"+downUrl,expressNo:expressDic[no]}]
            if(dwonUrlAndnoArr.length == Object.keys(expressDic).length){
              isOver = true;
              break;
            }
        }
    }
    if(isOver){
      break;
    }
    const nextBtn = await page.$(".page-next")
    if(!nextBtn){
        break
    }
    nextBtn.click()
    isSlider = await slider(page,shopName)
    if(isSlider){
      dwonUrlAndnoArr = []
      return await insertWuliu(page,shopInfo,shopName)
    }
  }

  for(let i=0;i<dwonUrlAndnoArr.length;i++){
    isSlider = await slider(page,shopName)
    if(isSlider){
      dwonUrlAndnoArr = []
      return await insertWuliu(page,shopInfo,shopName)
    }
    const dwonUrlAndno = dwonUrlAndnoArr[i]
    await page.waitForTimeout(2*1000)
    await page.goto(dwonUrlAndno.url);
    await page.waitForTimeout(2*1000)
    const offlineTab = await page.$('#offlineTab > a')
    offlineTab.click()
    await page.waitForTimeout(2*1000)
    await page.type("#ks-combobox-input105", dwonUrlAndno.expressNo.express)
    const content1 = await page.$(".ks-menuitem")
    content1.click()
    await page.waitForTimeout(1*1000)
    const moreBtn = await page.$("#J_OtherList > div.left-other > a")
    if(moreBtn){
        moreBtn.click()
        await page.waitForTimeout(1*1000)
        await page.type(".J_OtherCpName",dwonUrlAndno.expressNo.type)
        const typeSureBtn = await page.$(".J_SureOther")
        typeSureBtn.click()
    }
    const sureBtn = await page.$(".J_SearchBtn")
    sureBtn.click()
  }

}


module.exports = {fahuoinsert}
