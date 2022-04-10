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
// 菜鸟订单
let cainiaoOrderDic = {};
// 截止日期
let endDate= "";

const taobaoUrl = "https://www.taobao.com/";
const baseMysellUrl = "https://myseller.taobao.com/home.htm"
const oldMysellUrl = "https://myseller.taobao.com/home.htm#/index"
const newMysellUrl = "https://myseller.taobao.com/home.htm/QnworkbenchHome"
const loginMysellUrl = "https://loginmyseller.taobao.com";
const orderMysellUrl = "https://myseller.taobao.com/home.htm/batch-consign";
const tradeUrl = "https://trade.taobao.com/trade/detail/tradeSnap.htm?snapShot=true&tradeID="
const canniaoUrl = "https://fahuo.cainiao.com/"


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
  await page.waitForTimeout(2000)
  return page
}

// 获取店铺订单
const mysellConsign = async(shopName,date)=>{
  endDate = date
  const shopInfo = global.shopStore.get(shopName)
  let cookies = shopInfo.mysellerCookie;
  if(!cookies) return {code:0,msg:"没有cookie"};
  browser = await getBrowser();
  if(shopInfo.wuliux5sec){
    cookies = [...cookies,shopInfo.wuliux5sec]    
  }
  page = await getPage(browser,cookies)

  try{
    const res = await getPageInfo(page,shopInfo,shopName)
    if(res.code != 1){ 
      browser.close();
      return res;
    }
    if(totalOrders.length == 0){
      browser.close();
      return {code:1,msg:"沒有数据",data:[]};
    }
    // 去菜鸟获取
    await getCainiao(page,shopInfo,shopName)
    totalOrders.forEach(totalOrder => {
      const {buyer_memo,amount,total_fee} = cainiaoOrderDic[totalOrder.no];
      totalOrder.buyer_memo = buyer_memo
      totalOrder.amount = amount
      totalOrder.total_fee = total_fee
    });
    // 获取产品编号
    await getTradeInfo(page,shopInfo,shopName)
  }catch(e){
    browser.close();
    return {code:0,msg:"获取数据异常"};
  }
  browser.close();
  return {code:1,msg:"成功",data:totalOrders};

}

const getCainiao = async(page,shopInfo,shopName)=>{
  await page.goto(canniaoUrl);
  await page.waitForTimeout(1000)
  let isSlider = await slider(page,shopName)
  if(isSlider){
    await getCainiao(page,shopInfo,shopName)
    return 
  }
  const checked = await page.$eval(".btn_switch_expanding___1JTNN > button",e=>e.getAttribute("aria-checked"))
  if(checked === "false"){
    const checkBtn = await page.$(".btn_switch_expanding___1JTNN > button")
    checkBtn.click();
    await page.waitForTimeout(2000)
  }
  while(true){
    isSlider = await slider(page,shopName)
    if(isSlider){
      await getCainiao(page,shopInfo,shopName)
      return 
    }
    // 获取当前页的数据
    const containers = await page.$$(".order_item_container");
    for(let i=0;i<containers.length;i++){
      const container = containers[i]
      const pay_time = await container.$eval(".time_column > div > div > div:nth-child(2)",e=>e.innerText);
      if(!isBig(pay_time,endDate)){
        return 
      }
      const no = await container.$eval(".order_code_text",e=>e.innerText);
      const buyer_memo = await container.$eval(".buyer_memo_text",e=>e.innerText);
      let total_fee = await container.$eval(".total_fee_text",e=>e.innerText);
      total_fee = total_fee.replace(/¥/, "")
      const amount = await container.$eval(".amount_text",e=>e.innerText);
      cainiaoOrderDic[no] = {buyer_memo,amount,total_fee}
    }
    const nextStr = await page.$eval(".ant-pagination-next",e=>e.getAttribute("aria-disabled"))
    if(nextStr ==="true"){ // 最后一页了
      return;
    }
    const nextBtn = await page.$(".ant-pagination-next")
    nextBtn.click()
  }
}

const getTradeInfo = async(page,shopInfo,shopName)=>{
  for(let i=0;i<totalOrders.length;i++){
    let totalOrder = totalOrders[i]
    for(let j=0;j<totalOrder.products.length;j++){
      let product = totalOrder.products[j]
      await page.goto(tradeUrl+product.trade_id)
      await page.waitForTimeout(2000)
      const id = await page.$eval(".value-inline",e=>e.innerText)
      product.id = id
      const skuArr = await page.$$("div.key-value")
      let skuStr = "";
      for(let k=0;k<skuArr.length-1;k++){
        skuStr += await skuArr[k].$eval("p.value-block",e=>e.innerText)
        skuStr += ";"
      }
      product.sku = skuStr
      let isSlider = await slider(page,shopName)
      if(isSlider){
         await getTradeInfo(page,shopInfo,shopName)
         return;
      }
      await page.waitForTimeout(2000)
    }
  }
} 

const getPageInfo = async(page,shopInfo,shopName)=>{
  let curUrl = await page.url();
  if(curUrl.includes(loginMysellUrl)){// 重新登录
    shopInfo.isOnline = false;
    shopInfo.fahuox5sec = "";
    shopInfo.wuliux5sec = "";
    global.shopStore.put(shopName,shopInfo)
    return {code:0,msg:"cookie失效"};
  }else if(curUrl.includes(oldMysellUrl)){
    const isSlider = await slider(page,shopName)
    isSlider && await page.goto(baseMysellUrl)
    const newBtn = await page.$(".qn-header-new-btn")
    newBtn && newBtn.click();
    await page.waitForTimeout(3000)
  }
  let isSlider = await slider(page,shopName)
  isSlider && await page.goto(newMysellUrl)
  await page.goto(orderMysellUrl)
  await page.waitForTimeout(5000)
  isSlider = await slider(page,shopName)
  isSlider && await page.goto(orderMysellUrl)
  // 提过按钮点击
  const jumpBtn = await page.$(".intro--cardSkip--ntLfUxo")
  jumpBtn && jumpBtn.click();
  await page.waitForTimeout(1000)

  while(true){
    //显示地址
    const tables =  await page.$$(".batch-consign-table-group-normal")
    for(let i=0;i<tables.length;i++){
      let table = tables[i]
      const eyeBtn = await table.$(".qn_iconfont")
      eyeBtn && eyeBtn.click()
      await page.waitForTimeout(1000*Math.random()*2+1000)
      isSlider = await slider(page,shopName)
      if(isSlider){ // 重来
        totalOrders = []
        totalNos = []
        await page.goto(orderMysellUrl)
        return await getPageInfo(page,shopInfo,shopName)
      }
    }
    // 获取当前页面的订单
    let orders = await getCurPageOrder(page)
    if(orders.length == 0){
      return {code:1,msg:"获取完成"};
    }
    // 去重比较时间
    for(let i=0;i<orders.length;i++){
      const order = orders[i]
      if(totalNos.includes(order.no)){
        continue;
      }
      if(!isBig(order.pay_time,endDate)){
        return  {code:1,msg:"获取完成"};
      }
      totalNos = [...totalNos,order.no]
      totalOrders = [...totalOrders,order]
    }
    // 是否存在下一页
    const nextBtn = await page.$(".next-next")
    const nextDisable = await page.$eval(".next-next",e=>e.getAttribute("disabled"))
    if (!nextDisable && typeof(nextDisable)!="undefined" && nextDisable!=0) { // 存在下一页
      nextBtn.click()
    }else {
      break;
    }
    await page.waitForTimeout(2000)
  }
  return  {code:1,msg:"获取完成"};
}


const getCurPageOrder = async(page)=>{
  const res = await page.evaluate(() => {
    let tables = document.querySelectorAll(".batch-consign-table-group-normal")
    let orders = []
    tables.forEach(item => {
      let no = item.querySelector("tbody > tr.next-table-group-header > td:nth-child(2) > div > div > div.flex.flex-align-center > div.flex.flex-align-center > div > span").innerText
      no = no.replace(/订单编号：/, "")
      let buyer = item.querySelector("tbody > tr.next-table-group-header > td:nth-child(2) > div > div > div.flex.flex-align-center > div:nth-child(2) > a").innerText
      buyer = buyer.replace(//, "")
      let buye_meom = ""
      let user_memo = ""
      let pay_time = item.querySelector("tbody > tr.next-table-group-header > td:nth-child(2) > div > div > div:nth-child(2) > div > div:nth-child(2) > span").innerText
      pay_time = pay_time.replace(/支付时间：/, "")
      let addr = item.querySelector("tbody > tr.next-table-group-footer > td > div > div > div:nth-child(1) > div > div > span").innerText
      const trs = item.querySelectorAll("tbody > tr")
      let products = []
      for(let i=1;i<trs.length-1;i++){
        let tr = trs[i]
        let trade_url = tr.querySelector("td:nth-child(1) > div > div > div > div:nth-child(2) > a").getAttribute('href')
        let trade_id = trade_url.split("?tradeId=")[1]
        let goods_name = tr.querySelector("td:nth-child(1) > div > div > div > div:nth-child(2) > a > div").innerText
        let img_path = tr.querySelector("td:nth-child(1) > div > div > div > div.order-goods-pics > img").getAttribute('src')
        let amountFee = tr.querySelector("td:nth-child(2) > div > div > div").innerText
        amountFee = amountFee.replace(/￥/, "")
        let amountFeeArr = amountFee.split("*")
        let total_fee = amountFeeArr[0]
        let amount = amountFeeArr[1]
        products = [...products,{
          goods_name,img_path,total_fee,amount,trade_id
        }]

      }
      orders = [...orders,{
        products,addr,pay_time,user_memo,buye_meom,buyer,no
      }]
    })
    return orders;
  })
  return res;

}

module.exports = {mysellConsign}
