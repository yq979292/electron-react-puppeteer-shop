const puppeteer = require('puppeteer');
const {
  installMouseHelper
} = require('./install-mouse-helper');

// 当前订单号// 从系统中获取支付时间最新的订单号
const fahuoFrameUrl1 = 'https://fahuo.cainiao.com//consigns/order/decryptOrder.do';
const fahuoFrameUrl2 = 'https://fahuo.cainiao.com//consigns/normal/order/queryV2.do';
const taobaoUrl = "https://www.taobao.com/";

const loginwuliuUrl ="https://login.taobao.com/member/login.jhtml"
const wuliuUrl = "https://wuliu.taobao.com/user/order_list_new.htm?order_status_show=send"

let expressDic = {};

let dwonUrlAndnoArr = [];

// 登录
const order = async(cooks,express)=>{
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
  expressDic = express
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
    await page.goto(wuliuUrl)
    let curUrl = await page.url()
    if(curUrl.includes(loginwuliuUrl)){
        browser.close()
        return {
            msg:"cookies失效",
            code:1,
            data:null
        }
    }
    await page.waitForTimeout(4000)
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
    msg:"发货成功",
    code:0,
    data:null
    }
}

// 获取订单信息
const orderInfo = async (page) => {
  var isSlider = false
  isSlider = await isSliderFunc(page)
  if (isSlider) {
      await page.goto(orderFahuoUrl);
      await orderInfo(page);
      return
  }

  await page.waitForTimeout(5*1000)
  while(true){
    await page.waitForTimeout(5*1000)
    const tables = await page.$$(".j_expressTbody")
    for(let i=0;i<tables.length;i++){
        const table = tables[i]
        let no = await table.$eval(".order-number",e=>e.innerText)
        no = no.replace(/订单编号：/g,"")
        if(expressDic[no]){
            let downUrl = await table.$eval(".btn",e=>e.getAttribute('href'))
            dwonUrlAndnoArr = [...dwonUrlAndnoArr,{url:"https:"+downUrl,expressNo:expressDic[no]}]
        }
    }
    const nextBtn = await page.$(".page-next")
    if(!nextBtn){
        break
    }
    nextBtn.click()
    isSlider = await isSliderFunc(page)
    if (isSlider) {
        await page.goto(orderFahuoUrl);
        await orderInfo(page);
        return
    }
  }
  for(let i=0;i<dwonUrlAndnoArr.length;i++){
    isSlider = await isSliderFunc(page)
    if (isSlider) {
        await page.goto(orderFahuoUrl);
        await orderInfo(page);
        return
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
// ----start----待删

// let cooks = JSON.parse(fs.readFileSync("../taobaocookie.txt").toString());
// order(cooks,{"2521913437614256405":{"express":"2198686840252","type":"邮政"}})
// ----end----待删

module.exports = {order}