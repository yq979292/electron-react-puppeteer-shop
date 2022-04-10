// 获取店铺订单
const { Tooltip } = require('antd');
const puppeteer = require('puppeteer');
const { order } = require('../taobao/cainiao');
const { isBig } = require('./compareDate');
const {
  installMouseHelper
} = require('./install-mouse-helper');
const { slider } = require('./slider');



const taobaoUrl = "https://www.taobao.com/";
const baseMysellUrl = "https://myseller.taobao.com/home.htm"
const canniaoUrl = "https://fahuo.cainiao.com/"

let browser = null;
let page = null;
let noMemoDic = {};
let total = 0;
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
const memoinsert = async(shopName,memoDic)=>{
  try{
    noMemoDic = memoDic
    const shopInfo = global.shopStore.get(shopName)
    let cookies = shopInfo.mysellerCookie;
    if(!cookies) return {code:0,msg:"没有cookie"};
    browser = await getBrowser();
    if(shopInfo.wuliux5sec){
      cookies = [...cookies,shopInfo.wuliux5sec]    
    }
    page = await getPage(browser,cookies)
    await getCainiao(page,shopInfo,shopName)
  }catch(e){
    browser.close()
    console.log(e)
    return {code:0,msg:"设置备注失败"}
  }
  browser.close()
  return {code:1,msg:"设置备注成功"}

}

const getCainiao = async (page,shopInfo,shopName)=>{
  await page.goto(canniaoUrl);
  await page.waitForTimeout(1000)
  let isSlider = await slider(page,shopName)
  if(isSlider){
    return await getCainiao(page,shopInfo,shopName)
  }
  // 0关闭广告业
  await page.waitForTimeout(2 * 1000);
  const closeBtn = await page.$(".close___2FRDw")
  closeBtn && closeBtn.click()
  while (true) {
    // 3获取当前页面订单
    const re = await getCurPageOrder(page,shopInfo,shopName)
    if(!re){
      total = 0
      return await getCainiao(page,shopInfo,shopName)
    }
    if(total == Object.keys(noMemoDic).length) return;
    // 4点击下一页
    const nextStr = await page.$eval(".ant-pagination-next",e=>e.getAttribute("aria-disabled"))
    if(nextStr ==="true"){ // 最后一页了
      return ;
    }
    const nextBtn = await page.$(".ant-pagination-next")
    nextBtn.click()
    await page.waitForTimeout(2*1000)
    isSlider = await slider(page,shopName)
    if(isSlider){
      total=0
      return await getCainiao(page,shopInfo,shopName)
    }
  }
}
const getCurPageOrder = async (page,shopInfo,shopName) => {
  const containers = await page.$$(".order_item_container")
  for(let i=0;i<containers.length;i++){
      let container = containers[i]
      let no = await container.$eval(".order_code_text",e=>e.innerText)
      let userMemo =  await container.$eval(".user_memo_column",e=>e.innerText)
      if(userMemo){
        if(noMemoDic[no]) total++
        continue;
      }
      if (noMemoDic[no]){
          const addrBtn = await container.$('.operation_column > div > span:nth-child(3)')
          addrBtn.click()
          await page.waitForTimeout(2*1000)
          await page.type("#userMemo",noMemoDic[no])
          const updateBtn = await page.$(".ant-modal-footer > div > button.ant-btn.ant-btn-primary.ant-btn-lg")
          updateBtn.click();
          await page.waitForTimeout(2*1000)
          total++
          let isSlider = await slider(page,shopName)
          if(isSlider){
            return false
          }
      }
  }
  return true
}


module.exports = {memoinsert}
