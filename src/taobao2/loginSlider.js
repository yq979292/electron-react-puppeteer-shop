
const frameParams = [
  { frameUrl:'https://h5api.m.taobao.com:443//h5/mtop.taobao.jdy.resource.shop.info.get/1.0/_____tmd_____/punish',
  },
  { frameUrl:'https://h5api.m.taobao.com//h5/mtop.taobao.jdy.resource.shop.info.get/1.0/_____tmd_____/punish',
  },
]

const isLoginSlider = async (page)=>{
  await page.waitForTimeout(2000)
  let  isSlider = await loginSlider(page)
  while(isSlider){
    await page.waitForTimeout(2000)
    isSlider = await loginSlider(page)
  }
}

const loginSlider = async (page) => {
  const framePage = await page.frames().find(frame => {
    for (let i = 0; i < frameParams.length; i++) {
      let framePa = frameParams[i]
      if (frame.url().includes(framePa.frameUrl)) {
        return frame.url()
      }
    }
  });
  if(framePage){
    return true;
  }
  return false;
}
module.exports = {loginSlider,isLoginSlider}