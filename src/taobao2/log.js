
const addLog = (key,title)=>{
  const shopLogs = global.shopLogStore.get(key)?global.shopLogStore.get(key):[]
  global.shopLogStore.put(key,[...shopLogs,{title:(new Date()).toLocaleString()+` ${title}`}])
}

module.exports = {addLog}