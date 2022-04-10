const Storage = require('node-storage');
let shopLogStore = new Storage('runtime/storage/shopLog'); 
let baseKey = "shopLogs"
let memoKey = "memoLogs"
let fahuoKey = "fahuoLogs"

const addShopLog = (shopName,title)=>{
  let shopLogs = shopLogStore.get(baseKey) ? shopLogStore.get(baseKey) : []
  title = (new Date()).toLocaleString()+` ${shopName} ${title}`
  shopLogs = [...shopLogs,{title}]
  shopLogStore.put(baseKey,shopLogs)
}

const addMemoLog = (shopName,title)=>{
  let logs = shopLogStore.get(memoKey) ? shopLogStore.get(memoKey) : []
  title = (new Date()).toLocaleString()+` ${shopName} ${title}`
  logs = [...logs,{title}]
  shopLogStore.put(memoKey,logs)
}
const addFahuoLog = (shopName,title)=>{
  let logs = shopLogStore.get(fahuoKey) ? shopLogStore.get(fahuoKey) : []
  title = (new Date()).toLocaleString()+` ${shopName} ${title}`
  logs = [...logs,{title}]
  shopLogStore.put(fahuoKey,logs)
}

const getAllShopLog = ()=>{
  let shoplogs = shopLogStore.get(baseKey) ? shopLogStore.get(baseKey) : []
  const memologs = shopLogStore.get(memoKey)?shopLogStore.get(memoKey):[]
  const fahuoLogs = shopLogStore.get(fahuoKey)?shopLogStore.get(fahuoKey):[]
  return {orderlogs:shoplogs,memologs,fahuoLogs}  
}

const deleteShopLog = ()=>{
    shopLogStore.remove(baseKey)
    shopLogStore.remove(memoKey)
    shopLogStore.remove(fahuoKey)
}


module.exports = {
  addShopLog,
  getAllShopLog,
  addMemoLog,
  addFahuoLog,
  deleteShopLog
}