const { message } = require("antd");
const axios = require("axios");
const { addShopLog } = require("../storeTool/shopLog");
// 触发滑块的地址

const frameParams = [
  { frameUrl:'https://fahuo.cainiao.com//consigns/order/decryptOrder.do',
    sliderUrl:'https://fahuo.cainiao.com/consigns/normal/order/queryV2.do/_____tmd_____/slide',
    domain:"fahuo.cainiao.com",
    type:1,
  },
  { frameUrl:'https://fahuo.cainiao.com//consigns/normal/order/queryV2.do',
    sliderUrl:'https://fahuo.cainiao.com/consigns/normal/order/queryV2.do/_____tmd_____/slide',
    domain:"fahuo.cainiao.com",
    type:1,
  },
  { frameUrl:'https://wuliu.taobao.com//user/ajax_real_address.do',
    sliderUrl:'https://wuliu.taobao.com/user/ajax_real_address.do/_____tmd_____/slide',
    domain:"wuliu.taobao.com",
    type:2,
  },
  { frameUrl:'https://wuliu2.taobao.com//user/getRealReceiverInfo',
    sliderUrl:'https://wuliu2.taobao.com/user/getRealReceiverInfo/_____tmd_____/slide',
    domain:"wuliu2.taobao.com",
    type:2,
  },
  { frameUrl:'https://h5api.m.taobao.com//h5/mtop.taobao.jdy.resource.shop.info.get/1.0',
   sliderUrl:'https://h5api.m.taobao.com/h5/mtop.taobao.jdy.resource.shop.info.get/1.0/_____tmd_____/slide',
   domain:"h5api.m.taobao.com",
   type:2,
  },
]
// 重试次数
const replaceCount= 2
// 打开订单页面
const slider = async (page,shopName) => {
  await page.waitForTimeout(2000)
  let frameParam = null
  const framePage = await page.frames().find(frame => {
    for(let i=0;i<frameParams.length;i++){
      let framePa = frameParams[i]
      if (frame.url().includes(framePa.frameUrl)) {
        frameParam = framePa
        addShopLog(shopName,"有滑块")
        return frame.url()
      }
    }
  });
  if (framePage) {
    const token = await framePage.$eval("#nc-verify-form > input[type=hidden]:nth-child(1)", e => e.getAttribute('value'))
    const appkey = await framePage.$eval("#nc_app_key", e => e.getAttribute('value'))
    const x5data = await framePage.$eval("#x5secdata", e => e.getAttribute('value'))
    const slide_url = frameParam.sliderUrl
    const proxys = { 'http': 'http://112.29.178.30:39536', 'https': 'https://112.29.178.30:39536' }
    const client_ip = "96.0.4664.45"
    const taskId = "4261ab90a10411ec8f18f875a47ddce8"
    const content = JSON.stringify({
      taskId, slide_url, client_ip, appkey, token, x5data, proxys
    })
    let data = null
    for(let i=0;i<replaceCount;i++){
      const re = await axios.post("http://124.70.96.104:29630/slide/slideparams",content)
      console.log("silder==",re.data)
      if(re.data.message == "Success" && re.data.ua){
        data = re.data
        addShopLog(shopName,"滑块通过")
        break;
      }else{
        addShopLog(shopName,re.data.message)
      }
      await page.waitForTimeout(2*1000)
    }
    if(data){
      const c = {name: 'x5sec',value: data.ua,domain: frameParam.domain,path: '/',expires: -1,size: 221,httpOnly: true,secure: true,session: true,sameSite: 'None',sameParty: false,sourceScheme: 'Secure',sourcePort: 443}
      await page.setCookie(c)
      let shopInfo = global.shopStore.get(shopName)
      if(frameParam.type==1){
        shopInfo.fahuox5sec = c
      }else if(frameParam.type==2){
        shopInfo.wuliux5sec = c
      }
      global.shopStore.put(shopName,shopInfo)
    }
    return true
  }
  return false
}

module.exports = {slider}