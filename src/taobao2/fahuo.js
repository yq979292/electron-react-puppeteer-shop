// 获取店铺订单
let { message } = require('antd');
let puppeteer = require('puppeteer');
let { installMouseHelper } = require('./install-mouse-helper');
let { slider } = require('./slider');

let curNo = "";
let curShopName = "";
let taobaoUrl = "https://www.taobao.com/";
let cainiaoUrl = "https://fahuo.cainiao.com/"
let mysellBaseUrl = "https://myseller.taobao.com/home.htm"
let fahuoLoginUrl = "https://fahuo.cainiao.com/login.htm";


let browser = null;
let page = null;
let getBrowser = async()=>{
  let browser = await puppeteer.launch({
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

let totalOrders = []

let getPage = async(browser,cookies)=>{
  let page = await browser.newPage();
  await installMouseHelper(page); //调试鼠标轨迹专用
  cookies.forEach(cook => {
    page.setCookie(cook)
  });
  await page.goto(taobaoUrl)
  await page.waitForTimeout(1000)
  await page.goto(mysellBaseUrl)
  await page.waitForTimeout(1000)
  await page.goto(cainiaoUrl)
  await page.waitForTimeout(2000)
  return page
}

// 获取店铺订单
let fahuo = async(shopName,no)=>{
  try{
    curNo = no
    curShopName = shopName
    let shopInfo = global.shopStore.get(shopName)
    let cookies = shopInfo.fahuoCookie;
    if(!cookies){
      browser.close()
      return {code:0,msg:"没有cookie"};
    } 
    browser = await getBrowser();
    page = await getPage(browser,cookies)
    if(shopInfo.fahuox5sec){
      page.setCookie(shopInfo.fahuox5sec)
    }
    let curUrl = await page.url();
    if(curUrl.includes(fahuoLoginUrl)){ // 重新登录
      shopInfo.isOnline = false;
      shopInfo.fahuox5sec = "";
      shopInfo.wuliux5sec = "";
      global.shopStore.put(shopName,shopInfo)
      browser.close()
      return {code:0,msg:"cookie失效,重新登陆"};
    }
    // 去菜鸟获取
    await getCainiao(page)
  }catch(e){
    console.log(e)
    browser.close()
    return {code:0,msg:"获取菜鸟数据失败"};
  }
  // browser.close()
  return {code:1,msg:"获取菜鸟数据成功",data:totalOrders};
}

let getCainiao = async(page)=>{
  await page.goto(cainiaoUrl);
  await page.waitForTimeout(1000)
  let isSlider = await slider(page,curShopName)
  if(isSlider){
    await getCainiao(page)
    return 
  }
  let checked = await page.$eval(".btn_switch_expanding___1JTNN > button",e=>e.getAttribute("aria-checked"))
  if(checked === "false"){
    let checkBtn = await page.$(".btn_switch_expanding___1JTNN > button")
    checkBtn.click();
    await page.waitForTimeout(2000)
  }
  await page.waitForTimeout(2000)
  while(true){
    await page.waitForTimeout(2000)
    isSlider = await slider(page,curShopName)
    if(isSlider){
      totalOrders = []
      await getCainiao(page)
      return 
    }
    // 获取当前页的数据
    let orders = await getOrderInfo(page)
    isOver = false
    for(let i=0;i<orders.length;i++){
      let order= orders[i]
      if(order.no == curNo){ //程序结束
        return
      }
      totalOrders = [...totalOrders,order]
    }
    let nextStr = await page.$eval(".ant-pagination-next",e=>e.getAttribute("aria-disabled"))
    if(nextStr ==="true"){ // 最后一页了
      return;
    }
    let nextBtn = await page.$(".ant-pagination-next")
    nextBtn.click()
  }
}

// 2 获取订单信息
let getOrderInfo = async (page) => {
  await page.waitForTimeout(2 * 1000)
  let res = await page.evaluate(() => {
      let containers = document.querySelectorAll(".order_item_container")
      let datas = [];
      let curOrder = null;
      containers.forEach(item => {
          let no = item.querySelector(".order_code_text").innerText
          let buyer = item.querySelector(".buyer_nick_text").innerText
          let buye_meom = item.querySelector(".buyer_memo_text").innerText
          let user_memo = item.querySelector(".user_memo_text").innerText
          let amount = item.querySelector(".amount_text").innerText
          let total_fee = item.querySelector(".total_fee_text").innerText
          total_fee = total_fee.replace(/¥/, "")
          let pay_time = item.querySelector(".time_column > div > div > div:nth-child(2)").innerText
          let user = ""
          let tel = ""
          let addr = ""
          if(item.querySelector(".receiving_address")){
              addr = item.querySelector(".receiving_address").innerText
          }else{
              addr = curOrder.address.addr
          }
          let area= addr.split(" ")[0]
          let areas = area.split("/")
          let address = {addr,user,tel,province:areas[0],city:areas[1],district:areas[2],town:areas[3]?areas[3]:""}
          let products = []
          let productDivs = item.querySelectorAll(".ant-table-row-level-0")
          productDivs.forEach(productDiv => {
              let trade_id = productDiv.getAttribute('data-row-key')
              let goods_name = productDiv.querySelector(".goods_name_text").innerText
              let sku = productDiv.querySelector(".sku_container").innerText
              let goods_amount = productDiv.querySelector(".goods_amount").innerText
              let goods_price = productDiv.querySelector(".goods_price_container").innerText
              goods_price = goods_price.replace(/¥/, "")
              let goods_id_overflow = productDiv.querySelector(".goods_id_overflow").innerText
              goods_id_overflow = goods_id_overflow.replace(/\(未设置\)/, "")
              let img_path = productDiv.querySelector(".goods_name_container img").getAttribute('src')
              products.push({goods_name,sku,goods_amount,goods_price,goods_id_overflow,img_path,trade_id})
          })
          curOrder = {no,buyer,buye_meom,user_memo,amount,total_fee,pay_time,products,address}
          datas.push(curOrder)
      })
      return datas
  });
  return res;
}



module.exports = {fahuo}
