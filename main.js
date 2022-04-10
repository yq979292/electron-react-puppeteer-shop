const { app, BrowserWindow, ipcMain, nativeTheme,shell } = require('electron')
const puppeteer = require('puppeteer');
const path = require('path');
const taobao = require('./src/taobao/taobao')
const cainao = require('./src/taobao/cainiao')
const cainiaosellermemo = require('./src/taobao/cainiaosellermemo')
const cainiaosellermemoinsert = require('./src/taobao/cainiaosellermemoinsert')
const fahuoinsert = require('./src/taobao/fahuoinsert')
const Storage = require('node-storage');
global.shopLogStore = new Storage('runtime/storage/shopLog');
global.shopStore = new Storage('runtime/storage/shop');
const taobao2 = require("./src/taobao2/index");
const storeTool = require("./src/storeTool/index");
const { default: axios } = require('axios');
const { addShopLog,getAllShopLog, addMemoLog, addFahuoLog, deleteShopLog } = require('./src/storeTool/shopLog');
const url = "http://dq.51apper.com"

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  // win.setMenu(null);   
  // win.loadURL('http://localhost:3000/');
  win.loadFile('./build/index.html')
  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
  })

  ipcMain.handle('system:restart', () => {
    app.relaunch();
    app.exit();
  })
  
  // puppeteer 相关
  ipcMain.handle('taobao:login',taobaoLogin)
  ipcMain.handle('taobao:order',taobaoOrder)
  ipcMain.handle('taobao:sellerMemoorderInsert',sellerMemoorderInsert)
  ipcMain.handle('taobao:sellermemoorder',sellerMemoorder)
  ipcMain.handle('taobao:taobaofahuoinsert',taobaofahuoinsert)
  ipcMain.handle('taobao:getAll',getAll) // 获取所有 订单 备注 发货 
  
  // 打开平台(去拍单)
  ipcMain.handle('plant:open',plantOpen)

  // 本地localstorage相关
  ipcMain.handle('hklocalstorage:getShops',getShops)
  ipcMain.handle('hklocalstorage:delShop',delShop)
  ipcMain.handle('hklocalstorage:getShopLog',getShopLog)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async() => {
  console.log("close")
  deleteShopLog()
  const shopNames = global.shopStore.get("shopNames")
  for(let i=0;i<shopNames.length;i++){
    global.shopStore.remove(shopNames[i])
  }
  global.shopStore.remove("shopNames")
  await sleep(1000)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
// 获取店铺日志
const getShopLog = (event)=>{
  return getAllShopLog()
}

// 获取本地店铺
const getShops = async(event)=>{
  const shopNames = global.shopStore.get("shopNames")
  let shopInfos = [];
  if(shopNames){
    shopNames.forEach(shopName => {
      let tmp = global.shopStore.get(shopName)
      const isOnline = tmp?tmp.isOnline:false;
      const updateAt = tmp?tmp.updateAt:"";
      const type = "淘宝";
      const name = shopName;
      const id = tmp?tmp.id:0
      shopInfos = [...shopInfos,{name,isOnline,updateAt,type,id}]
    })
  }
  return shopInfos
}
// 删除店铺
const delShop = async(event,shopName) =>{
  let shopNames = global.shopStore.get("shopNames")
  let newShopNames = [];
  if(shopNames){
    newShopNames=shopNames.filter((item) => {
      if(item != shopName){
        return item;
      }
    }); 
  }
  global.shopStore.remove(shopName)
  global.shopStore.put("shopNames",newShopNames)
}

// 淘宝登录
const taobaoLogin = async(event,shopNames)=>{
  const isSuccess = await taobao2.login(shopNames)
  return isSuccess;
}

// 淘宝订单
const taobaoOrder = async (event, data)=>{
  const {id,shopName,paytime} = data;
  const shopLog = global.shopLogStore.get("shopLogs")?global.shopLogStore.get("shopLogs"):[]
  global.shopLogStore.put("shopLogs",[...shopLog,{title:(new Date()).toLocaleString()+` ${shopName} 开始获取订单`}])
  const res = await taobao2.mysellConsign(shopName,paytime);
  if(res.code == 1){
    const shopLog = global.shopLogStore.get("shopLogs")
    global.shopLogStore.put("shopLogs",[...shopLog,{title:(new Date()).toLocaleString()+` ${shopName} 同步订单${res.data.length}条`}])
  }else {
    const shopLog = global.shopLogStore.get("shopLogs")
    global.shopLogStore.put("shopLogs",[...shopLog,{title:(new Date()).toLocaleString()+` ${shopName} 获取订单失败`}])
  }
  return res
}

// 获取emo 为空的订单
const sellerMemoorder = async (event,data)=>{
  const shopName = data.shopName
  const shopinfo = shopStore.get(shopName)
  const orders = await cainiaosellermemo.order(shopinfo.mysellerCookie)
  console.log(orders)
  return orders;
}

// 设置卖家备注
const sellerMemoorderInsert = async (event,data)=>{
  const shopName = data.shopName
  const memoDic = data.memoDic
  const log = global.shopLogStore.get("memoLogs")?global.shopLogStore.get("memoLogs"):[]
  global.shopLogStore.put("memoLogs",[...log,{title:(new Date()).toLocaleString()+` ${shopName} 开始设置备注`}])
  const res = await taobao2.memoinsert(shopName,memoDic)
  if(res.code == 1){
    const log = global.shopLogStore.get("memoLogs")
    global.shopLogStore.put("memoLogs",[...log,{title:(new Date()).toLocaleString()+` ${shopName} 设置备注${Object.keys(memoDic).length}条`}])
  }else {
    const log = global.shopLogStore.get("memoLogs")
    global.shopLogStore.put("memoLogs",[...log,{title:(new Date()).toLocaleString()+` ${shopName} 设置备注失败`}])
  }
  return res;
}
// 系统发货
const taobaofahuoinsert = async (event,data)=>{
  const shopName = data.shopName
  const express = data.express
  const log = global.shopLogStore.get("fahuoLogs")?global.shopLogStore.get("fahuoLogs"):[]
  global.shopLogStore.put("fahuoLogs",[...log,{title:(new Date()).toLocaleString()+` ${shopName} 开始发货`}])
  const res = await taobao2.fahuoinsert(shopName,express)
  if(res.code == 1){
    const log = global.shopLogStore.get("fahuoLogs")
    global.shopLogStore.put("fahuoLogs",[...log,{title:(new Date()).toLocaleString()+` ${shopName} 发货了${Object.keys(express).length}条`}])
  }else {
    const log = global.shopLogStore.get("fahuoLogs")
    global.shopLogStore.put("fahuoLogs",[...log,{title:(new Date()).toLocaleString()+` ${shopName} 开始发货失败`}])
  }
  return res;
}

const plantOpen = async(event,url)=>{
  // "http://dqweb.51apper.com/#/login?token=01d3c349-184a-4c9b-80f4-b0517db459d9"
  shell.openExternal(url);
}


// 获取所有
const getAll = async (event,params)=>{
  const {dateTimes,token,shops} = params
  let curNos = []
  shops.forEach(shop => {
    curNos = [...curNos,""]
  });
  while(true){
    for(let i=0;i<shops.length;i++){
      let shop = shops[i]
      let {id,name} = shop
      // 1 获取菜鸟订单
      await cainiaoFunc(name,curNos[i])
      // 2 获取千牛地址 姓名
      await mysellFunc(name)
      // 3 获取产品编码
      await tradeFunc(name)
      // 4上传数据
      await postOrder(name,id,token,dateTimes[0],dateTimes[1])
      // 5 获取最新订单,下次抓取的时候就按照这个订单抓取
      let firstOrder = storeTool.getFirstOrder(name);
      curNos[i] = firstOrder.no
      // 6 设置memo备注
      await insertMemo(name,id,token)
      // 7 提交发货
      await expressdelivery(name,id,token)

    }
    addShopLog("",`每隔20分钟，抓取一次`)
    await sleep(20*60*1000)
  }
}

function sleep(ms) {
  return new Promise(resolve=>setTimeout(resolve, ms))
}

const expressdelivery = async(shopName,shopId,token)=>{
  addFahuoLog(shopName,"开始获取发货信息")
  let res = await axios.get(`${url}/api/order/expressdelivery?shop_id=${shopId}`,{
    headers: {
        'token': token
    }
  })
  if(res.data.code != 1){
    addFahuoLog(shopName,"获取发货信息失败")
    return
  }
  const resOrders = res.data.data;
  if (resOrders.length == 0){
    addFahuoLog(shopName,"没有发货信息")
    return
  }
  let express = {}
  let noArr = []
  resOrders.forEach(resOrder => {
    express[resOrder.order] = {express:resOrder.expressno,type:resOrder.expresstype}
    noArr = [...noArr,resOrder.order]
  });
  res= await taobao2.fahuoinsert(shopName,express)
  if(res.code !=1){
    addFahuoLog(shopName,"设置发货失败")
    return;
  }
  addFahuoLog(shopName,`发货信息同步了${resOrders.length}条`)
  const re = await axios.post(`${url}/api/order/expressdeliverydel`,{orders:noArr},{
    headers: {
        'token': token
    }
  })
  if(re.data.code != 1){
    return addFahuoLog(shopName,`发货信息上传数据库失败`)
  }
}

const insertMemo = async(shopName,shopId,token)=>{
  addMemoLog(shopName,"开始设置备注")
  let res = await axios.get(`${url}/api/order/needmemo?shop_id=${shopId}`,{
    headers: {
        'token': token
    }
  })
  if(res.data.code !=1){
    addMemoLog(shopName,"获取备注数据失败")
    return
  }
  if(res.data.length == 0){
    addMemoLog(shopName,"系统没有需要备注的数据")
    return
  }
  const orderDic ={}
  let noArr = []
  res.data.data.forEach(resOrder => {
    orderDic[resOrder.order] = resOrder.sellermemo
    noArr = [...noArr,resOrder.order]
  });
  res = await taobao2.memoinsert(shopName,orderDic)
  if(res.code == 1){
    addMemoLog(shopName,`设置备注${Object.keys(orderDic).length}条`)
  }else {
    addMemoLog(shopName,`设置备注失败`)
    return;
  }
  const needMemoRes = await axios.post(`${url}/api/order/needmemodel`,{orders:noArr},{
    headers: {
        'token': token
    }
  })
  if(needMemoRes.data.code != 1){
    return addMemoLog(shopName,`设置备注上传信息失败`)
  }
}

const postOrder = async(shopName,shopId,token,startTime,endTime)=>{
  let orders = storeTool.getOrdersByMytype3(shopName,shopId,startTime,endTime)
  let nos = []
  orders.forEach(order => {
    nos = [...nos,order.order]
  });
  if(orders.length == 0){
    addShopLog(shopName,`没有数据，无需上传`)
    return;
  }
  const res = await axios.post(`${url}/api/order/insertorder?shop_id=${shopId}`,{orders:orders},{
    headers: {
        'token': token
    }
  })
  if(res.data.code == 1){
    addShopLog(shopName,`上传成功${orders.length}条`)
    storeTool.getTradeIdsByMytype3to4(shopName,nos)
    addShopLog(shopName,`将上传的订单3改成4`)
  }else {
    addShopLog(shopName,"上传失败")
  }
}

const tradeFunc = async(shopName)=>{
  addShopLog(shopName,"开始获取产品id")
  const tradeIds = storeTool.getTradeIdsByMytype(shopName)
  const res = await taobao2.trade(shopName,tradeIds)
  if(res.code == 0){
    addShopLog(shopName,res.msg)
    return 
  }
  if(Object.keys(res.data).length == 0){
    addShopLog(shopName,`产品id获取到0条`)
    return
  }
  storeTool.updateOrderByTrade(shopName,res.data)
  addShopLog(shopName,`产品id获取到${Object.keys(res.data).length}条`)
  return;
}

const cainiaoFunc = async(shopName,no)=>{
  addShopLog(shopName,"开始获取菜鸟订单")
  const orderRes = await taobao2.fahuo(shopName,no)
  if(orderRes.code == 0){
    addShopLog(shopName,orderRes.msg)
    return;
  }
  if(orderRes.data.length == 0){
    addShopLog(shopName,"获取到0条数据")
    return;
  }
  storeTool.addOrders(shopName,orderRes.data)
  addShopLog(shopName,`获取到${orderRes.data.length}条数据`)
}

const mysellFunc =  async(shopName)=>{
  addShopLog(shopName,"开始获取千牛地址")
  const nos = storeTool.getNosByMyType(shopName);
  if(nos.length == 0){
    addShopLog(shopName,"没有新的千牛地址需要获取")
    return;
  }
  let mysellRes = await taobao2.mysellConsign(shopName,nos)
  if(mysellRes.code == 0){
    addShopLog(shopName,mysellRes.msg)
    return
  }
  if(Object.keys(mysellRes.data).length == 0){
    addShopLog(shopName,"千牛获取到0条数据")
    return
  }
  storeTool.updateOrdersByMyseller(shopName,mysellRes.data)
  addShopLog(shopName,`千牛获取到${Object.keys(mysellRes.data).length}条数据`)
}


