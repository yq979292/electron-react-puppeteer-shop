const puppeteer = require('puppeteer');
const {
  installMouseHelper
} = require('./install-mouse-helper');


// 所有的订单编号
let totalNos = [];
// 所有订单信息 
let totalOrders = [];
// 当前订单号// 从系统中获取支付时间最新的订单号
const fahuoFrameUrl1 = 'https://fahuo.cainiao.com//consigns/order/decryptOrder.do';
const fahuoFrameUrl2 = 'https://fahuo.cainiao.com//consigns/normal/order/queryV2.do';
const taobaoUrl = "https://www.taobao.com/";
const mysellerUrl = "https://myseller.taobao.com/home.htm#/index"
const fahuoUrl = "https://fahuo.cainiao.com/consigns/order/ggSend.htm?tab=tb_order"
const loginmysellerUrl = "https://loginmyseller.taobao.com/";
const loginfahuo = "https://fahuo.cainiao.com/login.htm";

let noMemoDic = {};

// 登录
const order = async(cooks,noMemo)=>{
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
  noMemoDic = noMemo
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
            data:null
        }
    }
    await orderInfo(page);
  }catch(e){
    return {
        msg:e,
        code:2,
        data:null
    }
  }
  browser.close()
  return {
    msg:"设置成功",
    code:0,
    data:null
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
  while (true) {
      // 3获取当前页面订单
      await getCurPageOrder(page)
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
    const containers = await page.$$(".order_item_container")
    for(let i=0;i<containers.length;i++){
        let container = containers[i]
        let no = await container.$eval(".order_code_text",e=>e.innerText)
        if (noMemoDic[no]){
            const addrBtn = await container.$('.operation_column > div > span:nth-child(3)')
            addrBtn.click()
            await page.waitForTimeout(2*1000)
            await page.type("#userMemo",noMemoDic[no])
            const updateBtn = await page.$(".ant-modal-footer > div > button.ant-btn.ant-btn-primary.ant-btn-lg")
            updateBtn.click();
            await page.waitForTimeout(2*1000)
        }
    }
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



module.exports = {order}