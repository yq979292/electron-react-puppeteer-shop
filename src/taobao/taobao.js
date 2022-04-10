const puppeteer = require('puppeteer');

// 登录
const login = async()=>{
  let shop_name = "";
  let cookies = [];
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 740 },
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
  await page.goto('https://login.taobao.com/member/login.jhtml?redirectURL=https://myseller.taobao.com');
  while(true){
    await page.waitForTimeout(2000)
    const url = await page.url()
    if (url.includes("https://myseller.taobao.com/home.htm")) {
      break;
    }
  }
  await page.waitForTimeout(2000)
  cookies = await page.cookies();
  shop_name = await page.$eval(".qn-header-shop-name",e=>e.innerText)
  browser.close();
  return {
    cookies,
    shop_name
  }
}

module.exports = {login}