const puppeteer = require('puppeteer');
const {
  installMouseHelper
} = require('./install-mouse-helper');


// 所有的订单编号
let totalNos = [];
// 所有订单信息 
let totalOrders = [];
// 当前订单号// 从系统中获取支付时间最新的订单号
let curNo = "";
const fahuoFrameUrl1 = 'https://fahuo.cainiao.com//consigns/order/decryptOrder.do';
const fahuoFrameUrl2 = 'https://fahuo.cainiao.com//consigns/normal/order/queryV2.do';
const taobaoUrl = "https://www.taobao.com/";
const mysellerUrl = "https://myseller.taobao.com/home.htm#/index"
const fahuoUrl = "https://fahuo.cainiao.com/consigns/order/ggSend.htm?tab=tb_order"
const loginmysellerUrl = "https://loginmyseller.taobao.com/";
const loginfahuo = "https://fahuo.cainiao.com/login.htm";


// 登录
const order = async(cooks,no)=>{
  curNo = no;
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
        width: 1920,
        height: 1080
    },
    slowMo: 200,
    ignoreDefaultArgs: [
        '--disable-infobars',
        '--enable-automation',
        'user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    ],
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', ],
    dumpio: false,
  });
  try{
    const page = await browser.newPage();
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        })
    })
    await installMouseHelper(page); //调试鼠标轨迹专用
    cooks.forEach(cook => {
        page.setCookie(cook)
    });
    await page.goto(taobaoUrl)
    await page.waitForTimeout(4000)
    await page.goto(mysellerUrl)
    let curUrl = await page.url()
    if(curUrl.includes(loginmysellerUrl)){
        browser.close()
        return {
            msg:"cookies失效",
            code:1,
            data:[]
        }
    }
    await page.waitForTimeout(4000)
    await page.goto(fahuoUrl);
    curUrl = await page.url()
    if(curUrl.includes(loginfahuo)){
        browser.close()
        return {
            msg:"cookies失效",
            code:1,
            data:[]
        }
    }
    await orderInfo(page);
  }catch(e){
    return {
        msg:e,
        code:2,
        data:[]
    }
  }
  browser.close()
  return {
    msg:"获取成功",
    code:0,
    data:totalOrders
}
}

// 获取订单信息
const orderInfo = async (page) => {
  var isSlider = false
  isSlider = await isSliderFunc(page)
  if (isSlider) {
      await page.goto(fahuoUrl);
      await orderInfo(page);
      return
  }

  // 0关闭广告业
  await page.waitForTimeout(2 * 1000);
  const closeBtn = await page.$(".close___2FRDw")
  closeBtn && closeBtn.click()
  // 1 点击商品信息
  const isSuccess = await antSwitchClick(page)
  if (!isSuccess) {
      await page.goto(fahuoUrl);
      await orderInfo(page);
      return
  }
  isSlider = await isSliderFunc(page)
  if (isSlider) {
      await page.goto(fahuoUrl);
      await orderInfo(page);
      return
  }

  while (true) {
      // 2 点击用户信息
      // const orderDivs = await page.$$('.order_item_container')
      // for (let i = 0; i < orderDivs.length; i++) {
      //     const userBtn = await orderDivs[i].$('.receiving_info_user svg')
      //     if (userBtn) {
      //         userBtn.click();
      //         isSlider = await isSliderFunc(page)
      //         if (isSlider) {
      //             await page.goto(fahuoUrl);
      //             await orderInfo(page);
      //             return
      //         }
      //     }
      // }
      // 3获取当前页面订单
      const isOver = await getCurPageOrder(page)
      if (isOver) {
          // 结束不需要下一页
          break;
      }
      // 4点击下一页
      const disableBtn = await page.$('.table_pagination .ant-pagination-disabled')
      if (disableBtn) {
          const title = await page.$eval('.table_pagination .ant-pagination-disabled', a => a.title)
          if (title == "下一页") { // 程序结束
              break;
          }
      }
      const next = await page.$(".table_pagination .ant-pagination-next a")
      await next.click();
      isSlider = await isSliderFunc(page)
      if (isSlider) {
          await page.goto(fahuoUrl);
          await orderInfo(page);
          return
      }
  }
}



// 2 获取当前页面订单 true就是不需要进入下一页了
const getCurPageOrder = async (page) => {
  const orders = await getOrderInfo(page)
  let res = [];
  for (let i = 0; i < orders.length; i++) {
      const order = orders[i]
      if (order.no == curNo) {
          totalOrders = [...totalOrders, ...res]
          return true
      }
      res = [...res, order]
  }
  totalOrders = [...totalOrders, ...res]
  return false
}


// 判断是否有滑块验证
const isSliderFunc = async (page) => {
  let is = false
  while (true) {
      await page.waitForTimeout(2 * 1000)
      let frame = await page.frames().find(frame => {
          if (frame.url().includes(fahuoFrameUrl1)) {
              return frame.url()
          } else if (frame.url().includes(fahuoFrameUrl2)) {
              return frame.url()
          }
      });
      if (frame) {
          const cnt = await frame.$(".nc-lang-cnt")
          if (cnt) {
              const a = await frame.$eval(".nc-lang-cnt", e => e.innerText)
              if (!a.includes("加载中")) {
                  is = true
              } else {
                  break;
              }
          } else {
              is = true
          }

      } else {
          break;
      }
  }
  return is
}


// // 1.点击商品信息
const antSwitchClick = async (page) => {
  await page.waitForTimeout(2 * 1000);
  const btn = await page.$('.ant-switch')
  if (btn) {
      btn.click()
      return true
  }
  return false
}

// 2 获取订单信息
const getOrderInfo = async (page) => {
  await page.waitForTimeout(5 * 1000)
  const res = await page.evaluate((totalNos) => {
      let containers = document.querySelectorAll(".order_item_container")
      let datas = [];
      let curOrder = null;
      containers.forEach(item => {
          const no = item.querySelector(".order_code_text").innerText
          const buyer = item.querySelector(".buyer_nick_text").innerText
          const buye_meom = item.querySelector(".buyer_memo_text").innerText
          const user_memo = item.querySelector(".user_memo_text").innerText
          const amount = item.querySelector(".amount_text").innerText
          const total_fee = item.querySelector(".total_fee_text").innerText
          const pay_time = item.querySelector(".time_column > div > div > div:nth-child(2)").innerText
          let user = ""
          let tel = ""
          let addr = ""
          if(item.querySelector(".receiving_user")){
              const userTel = item.querySelector(".receiving_user").innerText
              var userTelArr = userTel.split(' ');
              user = userTelArr[0]
              tel = userTelArr[1]
          }else {
              user = curOrder.address.user;
              tel = curOrder.address.tel;
          }
          if(item.querySelector(".receiving_address")){
              addr = item.querySelector(".receiving_address").innerText
          }else{
              addr = curOrder.address.addr
          }
          const address = {addr,user,tel}
          let products = []
          const productDivs = item.querySelectorAll(".ant-table-row-level-0")
          productDivs.forEach(productDiv => {
              const id = productDiv.getAttribute('data-row-key')
              const goods_name = productDiv.querySelector(".goods_name_text").innerText
              const sku = productDiv.querySelector(".sku_container").innerText
              const goods_amount = productDiv.querySelector(".goods_amount").innerText
              const goods_price = productDiv.querySelector(".goods_price_container").innerText
              const goods_id_overflow = productDiv.querySelector(".goods_id_overflow").innerText
              const img_path = productDiv.querySelector(".goods_name_container img").getAttribute('src')
              if(productDiv.querySelector('.good_status_container') && productDiv.querySelector('.good_status_container').innerText == "退款成功"){
                  // 不加入
              }else {
                  products.push({goods_name,sku,goods_amount,goods_price,goods_id_overflow,img_path,id})
              }
          })
          curOrder = {no,buyer,buye_meom,user_memo,amount,total_fee,pay_time,products,address}
          // 去重
          if (!totalNos.includes(no)) {
              totalNos = [...totalNos, no]
              datas.push(curOrder)
          }
      })
      return datas
  }, totalNos);
  return res;
}



module.exports = {order}