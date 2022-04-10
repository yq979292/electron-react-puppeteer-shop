const puppeteer = require('puppeteer');
var fs = require('fs');
var http = require('http');
const { installMouseHelper } = require('./install-mouse-helper');
const autoSlider = require('./autoSlider');
const captchaBehaviorUtil = require('./CaptchaBehaviorUtil');
const { constants } = require('buffer');
// https://login.taobao.com/member/login.jhtml?redirectURL=http%3A%2F%2Fmai.taobao.com%2Fseller_admin.htm

// 所有的订单编号
let totalNos = [];
// 所有订单信息 
let totalOrders = [];
// 当前订单号
let curNo = "1509131785639718990";
// 当前页面url
let curPageUrl = "";
// iframe是否触发,如果true，那么允许这个方法执行
let isFramenavigated = true;
// 触发滑块的地址
const fahuoFrameUrl = 'https://fahuo.cainiao.com//consigns/order/decryptOrder.do';
const wuliuFrameUrl = 'https://wuliu.taobao.com//user/ajax_real_address.do';
const queryFrameUrl = 'https://fahuo.cainiao.com//consigns/normal/order/queryV2.do';


// 打开订单页面
const orderPage = async () => {
  let cooks = JSON.parse(fs.readFileSync("taobaocookie.txt").toString());
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
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
  await page.evaluate(async () => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  page.on('response', response => {
    // console.log(response.url())
  })
  page.on("load", async (event) => {
    const url = await page.url()
    if (url.includes("https://fahuo.cainiao.com/consigns/order/ggSend.htm?tab=tb_order")) {
      console.log("我来了--fahuo.cainiao.com")
      // // 1 点击商品信息
      // await page.waitForTimeout(10 * 1000)
      // await antSwitchClick(page)
      // // 2 获取订单
      // await fahuoCainiaoCom(page)
      // // 3 获取订单地址
      // await getAddress(page)
      return;
    }
    // if (url.includes(fahuoFrameUrl) || url.includes(wuliuFrameUrl)) {
    //   // 处理滑块页面
    //   await autoSlider.taobao(page)
    //   // await page.goto(curPageUrl)
    //   return;
    // }


  })
  page.on('framenavigated', async (event) => {
    if (!isFramenavigated) {
      return;
    }
    // 处理滑块
    const frame = await page.frames().find(frame => {
      if (frame.url().includes(wuliuFrameUrl)) {
        return frame.url()
      }
      if (frame.url().includes(fahuoFrameUrl)) {
        return frame.url()
      }
      if (frame.url().includes(queryFrameUrl)) {
        return frame.url()
      }
    });
    if (frame) {
      const token = await frame.$eval("#nc-verify-form > input[type=hidden]:nth-child(1)", e => e.getAttribute('value'))
      const appkey = await frame.$eval("#nc_app_key", e => e.getAttribute('value'))
      const x5data = await frame.$eval("#x5secdata", e => e.getAttribute('value'))
      const proxys = {'http': 'http://112.29.178.30:39536', 'https': 'https://112.29.178.30:39536'}
      const client_ip = "96.0.4664.45"
      const taskId = "4261ab90a10411ec8f18f875a47ddce8"
      const slide_url = "https://fahuo.cainiao.com/consigns/normal/order/queryV2.do/_____tmd_____/slide"

      const content = JSON.stringify({
        taskId,slide_url,client_ip,appkey,token,x5data,proxys
      })

      var options = {

        host: '124.70.96.104',

        port: 29630,

        path: '/slide/slideparams',

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'Content-Length': content.length

        }

      };

      console.log("post options:\n", options);

      console.log("content:", content);

      console.log("\n");



      var req = http.request(options, function (res) {

        console.log("statusCode: ", res.statusCode);

        console.log("headers: ", res.headers);

        var _data = '';

        res.on('data', function (chunk) {

          _data += chunk;

        });

        res.on('end', function () {

          console.log("\n--->>\nresult:", _data)

        });

      });



      req.write(content);

      req.end();



      // https://fahuo.cainiao.com//consigns/order/decryptOrder.do

      // curPageUrl = await page.url();
      // isFramenavigated = false;
      // await page.goto(frame.url())
    }
  })

  await installMouseHelper(page); //调试鼠标轨迹专用
  cooks.forEach(cook => {
    page.setCookie(cook)
  });
  await page.goto("https://www.taobao.com/")
  await page.waitForTimeout(4000)
  await page.goto('https://myseller.taobao.com/home.htm#/index')
  await page.waitForTimeout(4000)
  await page.goto('https://fahuo.cainiao.com/consigns/order/ggSend.htm?tab=tb_order');

  // start--处理滑块
  // await page.goto('https://wuliu.taobao.com/user/consign.htm?trade_id=1511545909644544190');
  // let eyeAddressBtn = await page.$("#eyeAddress");
  // eyeAddressBtn.click()

  // let url = await page.url()
  // console.log(url)
  // await page.waitForTimeout(4*1000)
  // let dialogContent = await page.$("#baxia-dialog-content")
  // if(dialogContent){
  //   const src = await page.$eval('#baxia-dialog-content',c=>c.src)
  // }
  // ent ---处理滑块
}

// 获取地址
const getAddress = async (page) => {
  let res = [];
  for (let i = 0; i < totalOrders.length; i++) {
    await page.waitForTimeout(Math.ceil(Math.random() * 5) * 1000)
    let order = totalOrders[i]
    await page.goto("https://wuliu.taobao.com/user/consign.htm?trade_id=" + order.no)
    await page.waitForSelector("#eyeAddress")
    let eyeAddressBtn = await page.$("#eyeAddress");
    eyeAddressBtn.click()
    await page.waitForTimeout(10000)
    address = await page.$eval("#receiverInfo", item => item.innerText)
    order = { ...order, address }
    res = [...res, order]
  }
  console.log(JSON.stringify(res))
}

// 处理菜鸟发货(这里面获取订单信息)
const fahuoCainiaoCom = async (page) => {
  // 2 获取订单信息
  const orders = await getOrderInfo(page)
  // 2.1 处理数据，当订单编号和当前编号一样是结束。
  let res = [];
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    if (order.no == curNo) {
      totalOrders = [...totalOrders, ...res]
      return
    }
    res = [...res, order]
  }

  totalOrders = [...totalOrders, ...res]
  // 3 点击下一页
  const isClick = await isClickNextPage(page)
  await page.waitForTimeout(5 * 1000);
  if (isClick) {
    await fahuoCainiaoCom(page)
  }
}

//  点击下一页
const isClickNextPage = async (page) => {
  const disableBtn = await page.$('.table_pagination .ant-pagination-disabled')
  if (disableBtn) {
    const title = await page.$eval('.table_pagination .ant-pagination-disabled', a => a.title)
    if (title == "下一页") { // 程序结束
      return false
    }
  }
  const next = await page.$(".table_pagination .ant-pagination-next a")
  await next.click();
  await page.waitForTimeout(10000)
  return true
}

// 1.点击商品信息
const antSwitchClick = async (page) => {
  const btn = await page.$('.ant-switch')
  btn.click()
}

// 2 获取订单信息
const getOrderInfo = async (page) => {
  console.log("getOrderInfo---")
  await page.waitForTimeout(10000)
  const res = await page.evaluate((totalNos) => {
    let containers = document.querySelectorAll(".order_item_container")
    let datas = [];
    containers.forEach(item => {
      const no = item.querySelector(".order_code_text").innerText
      const buyer = item.querySelector(".buyer_nick_text").innerText
      const buye_meom = item.querySelector(".buyer_memo_text").innerText
      const user_memo = item.querySelector(".user_memo_text").innerText
      const amount = item.querySelector(".amount_text").innerText
      const total_fee = item.querySelector(".total_fee_text").innerText
      const pay_time = item.querySelector(".time_column > div > div > div:nth-child(2)").innerText
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
        products.push({ goods_name, sku, goods_amount, goods_price, goods_id_overflow, img_path, id })
      })
      // 去重
      if (!totalNos.includes(no)) {
        totalNos = [...totalNos, no]
        datas.push({
          no, buyer, buye_meom, user_memo, amount, total_fee, pay_time, products
        })
      }
    })
    return datas
  }, totalNos);
  return res;
}
orderPage();