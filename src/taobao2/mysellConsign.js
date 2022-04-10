// 获取店铺订单
const puppeteer = require('puppeteer');
const { addShopLog } = require('../storeTool/shopLog');
const {
  installMouseHelper
} = require('./install-mouse-helper');
const { slider } = require('./slider');
const { taobaoSlider } = require('./taobaoSlider');

let totalOrders = {};
let curNos = []
const taobaoUrl = "https://www.taobao.com/";
const baseMysellUrl = "https://myseller.taobao.com/home.htm"
const oldMysellUrl = "https://myseller.taobao.com/home.htm#/index"
const loginMysellUrl = "https://loginmyseller.taobao.com";
const batchMysellUrl = "https://myseller.taobao.com/home.htm/batch-consign";

let browser = null;
let page = null;
let curShopName = ""

const getBrowser = async()=>{
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {width: 1300,height: 761},
    slowMo: 200,
    ignoreDefaultArgs: [
        '--disable-infobars',
        '--enable-automation',
        'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    ],
    args: ['--start-maximized', '--no-sandbox','--disable-gpu', 
    '--disable-setuid-sandbox','--disable-dev-shm-usage','-enable-webgl',
     '--disable-blink-features=AutomationControlled', 
     '--disable-features=site-per-process',// iframe获取需要添加
    ],
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
const mysellConsign = async(shopName,nos)=>{
  try{
    curShopName = shopName;
    curNos = nos;
    const shopInfo = global.shopStore.get(shopName)
    let cookies = shopInfo.mysellerCookie;
    if(!cookies) {
      browser.close()
      return {code:0,msg:"千牛没有cookie"};
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
    }else if(curUrl.includes(oldMysellUrl)){
      const isSlider = await slider(page,shopName)
      isSlider && await page.goto(baseMysellUrl)
      const newBtn = await page.$(".qn-header-new-btn")
      newBtn && newBtn.click();
      await page.waitForTimeout(3000)
    }
    await getPageInfo(page)
  }catch(e){
    console.log("yichangle===")
    console.log(e)
      // 页面渲染完毕后，开始截图
  await page.screenshot({
    path: './dashboard_shot.png',
    clip: {
      x: 0,
      y: 0,
      width: 1300,
      height: 1000
    }
  });
    addShopLog(shopName,e)
    // browser.close()
    return {code:0,msg:"获取千牛数据失败"};
  }
  return {code:1,msg:"获取千牛数据成功",data:totalOrders};
}

const getPageInfo = async(page)=>{
  await page.waitForTimeout(10000)
  await page.goto(batchMysellUrl)
  // 检查非frame滑块
  let isSlider = await taobaoSlider(page,curShopName)
  if(isSlider){
    await page.goto(batchMysellUrl)
    return;
  }
  // 检查frame滑块
  isSlider = await slider(page,curShopName)
  if(isSlider){
    await page.goto(batchMysellUrl)
    return;
  }
  await page.waitForTimeout(10000)
  // 跳过按钮点击
  const jumpBtn = await page.$(".intro--cardSkip--ntLfUxo")
  jumpBtn && jumpBtn.click();
  await page.waitForTimeout(10000)
  while(true){
    // 跳过按钮点击
    const jumpBtn = await page.$(".intro--cardSkip--ntLfUxo")
    jumpBtn && jumpBtn.click();
    // 移动到最后
    const lastBtn = await page.$(".next-btn.next-medium.next-btn-normal.next-pagination-item.next-current")
    lastBtn && lastBtn.click()
    await page.waitForTimeout(1000)
    //显示地址
    const tables =  await page.$$(".batch-consign-table-group-normal")
    for(let i=tables.length-1;i>=0;i--){
      let table = tables[i]
      let no = await table.$eval("tbody > tr.next-table-group-header > td:nth-child(2) > div > div > div.flex.flex-align-center > div.flex.flex-align-center > div > span",e=>e.innerText)
      no = no.replace(/订单编号：/, "")
      if(!curNos.includes(no)) continue;
      // 查看地址
      const eyeBtn = await table.$(".qn_iconfont")
      eyeBtn && eyeBtn.click()
      await page.waitForTimeout(1000*Math.random()+500)
      isSlider = await slider(page,curShopName)
      console.log("isSlider===",isSlider)
      if(isSlider){ // 重来
        console.log("有滑块，重来")
        await getPageInfo(page)
        return 
      }
      // 存储数据
      let addr = await table.$eval("tbody > tr.next-table-group-footer span",e=>e.innerText)
      if(!addr){
        console.log("地址不存在，重来")
        await getPageInfo(page)
        return
      }
      totalOrders[no] = dealAddr(addr)
    }
    if(Object.keys(totalOrders).length == curNos.length){
      break;   
    }
    // 是否存在下一页
    const nextBtn = await page.$(".next-next")
    const nextDisable = await page.$eval(".next-next",e=>e.getAttribute("disabled"))
    const curPage = await page.$eval(".next-next",e=>e.getAttribute("aria-label"))
    if (!nextDisable && typeof(nextDisable)!="undefined" && nextDisable!=0) { // 存在下一页
      console.log(curPage)
      nextBtn.click()
    }else {
      break;
    }
    await page.waitForTimeout(2000)
  }
  return ;
}

const dealAddr = (addrStr)=>{
  addrStr = addrStr.replace(/，/, ",")
  const infos = addrStr.split(",")
  const user = infos[infos.length-2].trim()
  const tel = infos[infos.length-1].trim()
  let addr = ""
  for(let m=0;m<infos.length-2;m++){
      addr += infos[m] 
  }
  return {addr,user,tel}
}

module.exports = {mysellConsign}
