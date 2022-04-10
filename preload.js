const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('darkMode', {
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
  system: () => ipcRenderer.invoke('dark-mode:system')
})

contextBridge.exposeInMainWorld('taobao', {
    login: (data) => ipcRenderer.invoke('taobao:login',data),//改
    order: (data) => ipcRenderer.invoke('taobao:order',data), //改
    sellerMemoorderInsert:(data)=>ipcRenderer.invoke('taobao:sellerMemoorderInsert',data),// 改
    getAll:(data)=>ipcRenderer.invoke('taobao:getAll',data),
    sellermemoorder:(data)=>ipcRenderer.invoke('taobao:sellermemoorder',data),
    taobaofahuoinsert:(data)=>ipcRenderer.invoke('taobao:taobaofahuoinsert',data),
})
contextBridge.exposeInMainWorld('plant', {
  open: (data) => ipcRenderer.invoke('plant:open',data)
})

contextBridge.exposeInMainWorld('system', {
  restart: () => ipcRenderer.invoke('system:restart'),
})

contextBridge.exposeInMainWorld('hklocalstorage', {
  getShops: () => ipcRenderer.invoke('hklocalstorage:getShops'),
  delShop: (shopName) =>ipcRenderer.invoke('hklocalstorage:delShop',shopName),
  getShopLog: () =>ipcRenderer.invoke('hklocalstorage:getShopLog'),
})


