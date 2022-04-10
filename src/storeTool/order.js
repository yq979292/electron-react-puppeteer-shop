const Storage = require('node-storage');
const { order } = require('../taobao/fahuoinsert');
let orderStore = new Storage('runtime/storage/order'); //艾芙俪玟家居_orders:[] 这个就是获取该店铺所有订单; 艾芙俪玟家居_nos:[] 这个就是所有的订单号，方便去重
let orderBaseKey = "_orders";
let noBaseKey = "_nos";

// 获取订单
const getOrders = (shopName, startTime, endTime) => {
    let orders = orderStore.get(`${shopName}${orderBaseKey}`)
    if (!startTime || !endTime) {
        return orders
    }
    return orders
}
// 获取订单(mytype =3)
const getOrdersByMytype3 = (shopName,shopId, startTime, endTime) => {
    let startTimestamp = Date.parse(new Date(startTime)); // 时间戳
    let endTimestamp = Date.parse(new Date(endTime)); // 时间戳
    let orders = orderStore.get(`${shopName}${orderBaseKey}`)
    if (!startTime || !endTime) {
        return orders
    }
    let res = []
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i]
        if (order.mytype != 3 ||startTimestamp > order.pay_timestamp ||endTimestamp < order.pay_timestamp) {
            continue;
        }
        let {no,buyer,buye_meom,user_memo,amount,total_fee,pay_time,products,address} = order
        let tmpProducts = []
        products.forEach(product => {
          let {goods_name,img_path,goods_price,sku,goods_amount,id,goods_id_overflow} = product
          tmpProducts = [...tmpProducts,{
            order:no,outerid:goods_id_overflow,refund:"NO_REFUND",state:1,
            sellnick:shopName,num:goods_amount,title:goods_name,picpath:img_path,numid:id,
            totalfee:goods_price,skuname:sku,
          }]
        });
        let {addr,user,tel,province,city,district,town} = address
        let tmpAddress = {
            addr,
            adr:addr,
            province,city,district,town,
            mobilephone:tel,name:user,post:"000000",
        }
        let tmpOrder = {buyerid:buyer,tstatus:"WAIT_SELLER_SEND_GOODS",buyermemo:buye_meom,
            sellerflag:0,nick:shopName,totolfee:total_fee,shop_id:shopId,order:no,orderstatus:1,
            paytime:pay_time,sellermemo:user_memo,amount,products:tmpProducts,address:tmpAddress,
        }
        res = [...res,tmpOrder]
    }
    return res
}

// 添加订单
const addOrder = (shopName, order) => {
    let noKey = shopName + noBaseKey
    let orderKey = shopName + orderBaseKey
    let nos = orderStore.get(noKey) ? orderStore.get(noKey) : []
    if (nos.includes(order.no)) {
        return
    }
    order.mytype = 1 // cainiao 里面的数据
    let orders = orderStore.get(orderKey) ? orderStore.get(orderKey) : []
    orders = [...orders, order]
    nos = [...nos, order.no]
    orderStore.put(orderKey, orders)
    orderStore.put(noKey, nos)
}

// 添加所有订单
const addOrders = (shopName, items) => {
    let noKey = shopName + noBaseKey
    let orderKey = shopName + orderBaseKey
    let orders = orderStore.get(orderKey) ? orderStore.get(orderKey) : []
    let nos = orderStore.get(noKey) ? orderStore.get(noKey) : []
    // 处理数据
    for (let i = 0; i < items.length; i++) {
        const order = items[i]
        if (order.products.length == 0) { //产品获取失败
            continue;
        }
        if (nos.includes(order.no)) {
            continue;
        }
        order.pay_timestamp = Date.parse(new Date(order.pay_time)); // 时间戳
        order.mytype = 1 // cainiao的数据
        orders = [...orders, order]
        nos = [...nos, order.no]
    }
    orders = orders.sort((a, b) => {
        return b.pay_timestamp - a.pay_timestamp
    })
    // 排序
    orderStore.put(orderKey, orders)
    orderStore.put(noKey, nos)
}

// 获取订单编号通过自定义类型1（千牛应该爬取的订单号）
const getNosByMyType = (shopName) => {
    let orderKey = shopName + orderBaseKey
    let orders = orderStore.get(orderKey) ? orderStore.get(orderKey) : []
    let nos = []
    orders.forEach(order => {
        if (order.mytype == 1) {
            nos = [...nos, order.no]
        }
    });
    return nos
}

// 修改所有订单信息(千牛) 
//   {
//     '1524853203491600290': {
//       addr: '江西省上饶市德兴市 银城街道 幸福家园廉租房三期2栋一单元601',
//       user: '戴琦',
//       tel: '15270392152'
//     }
//   }
const updateOrdersByMyseller = (shopName, items) => {
    let orderKey = shopName + orderBaseKey
    let orders = orderStore.get(orderKey) ? orderStore.get(orderKey) : []
    if (orders.length == 0) return;
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i]
        if (order.mytype != 1) continue;
        order.mytype = 2 // 千牛搞定
        if (items[order.no]) {
            let {
                addr,
                user,
                tel
            } = items[order.no]
            order.address.addr = addr
            order.address.user = user
            order.address.tel = tel
        }
    }
    orderStore.put(orderKey, orders)
}

// 修改订单信息(千牛发货) 
// {  
//     user :"昊然",
//     tel:"13196420518"
//     addr:"江苏省无锡市滨湖区 太湖街道 英廷时尚艺术沙龙上海品质店",
//     no:"123",
// }
const updateOrderByMyseller = (shopName, order) => {
    let orderKey = shopName + orderBaseKey
    let orders = orderStore.get(orderKey)
    if (orders.length == 0) return;
    let {
        addr,
        no,
        name,
        tel
    } = order;
    for (let i = 0; i < orders.length; i++) {
        let item = orders[i]
        if (item.no == no) {
            item.mytype = 2
            let itemAddr = item.addr
            itemAddr.addr = addr
            itemAddr.tel = tel
            itemAddr.name = name
            break;
        }
    }
    orderStore.put(orderKey, orders)
}

// 修改订单信息(trade.taobao.com) 
// {
//     '2541104246930467044': '667410282449',
//     '1524897806266596495': '667128615434',
// }
const updateOrderByTrade = (shopName, items) => {
    let orderKey = shopName + orderBaseKey
    let orders = orderStore.get(orderKey)
    if (orders.length == 0) return;
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i]
        if (order.mytype != 2) {
            continue;
        }
        let products = order.products
        let mytype = 3
        for (let j = 0; j < products.length; j++) {
            const product = products[j]
            if (items[product.trade_id]) {
                product.id = items[product.trade_id]
            }
            if (!product.id) {
                mytype = 2
            }
        }
        order.mytype = mytype
    }
    orderStore.put(orderKey, orders)
}

// 获取状态为2的交易id
const getTradeIdsByMytype = (shopName) => {
    let orderKey = shopName + orderBaseKey
    let orders = orderStore.get(orderKey)
    let res = []
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i]
        if (order.mytype != 2) continue;
        let products = order.products
        for (let j = 0; j < products.length; j++) {
            let product = products[j]
            res = [...res, product.trade_id]
        }
    }
    return res
}

// 上传成功后，修改状态为3的变成4
const getTradeIdsByMytype3to4 = (shopName,nos) => {
    let orderKey = shopName + orderBaseKey
    let orders = orderStore.get(orderKey)
    for (let i = 0; i < orders.length; i++) {
        let order = orders[i]
        if (order.mytype != 3) continue;
        if (nos.includes(order.no)){
            order.mytype = 4;
        }
    }
    orderStore.put(orderKey, orders) 
}

// 获取第一个订单
const getFirstOrder = (shopName) => {
    let orderKey = shopName + orderBaseKey
    let orders = orderStore.get(orderKey)
    if(orders.length == 0){
        return null
    }
    return orders[0]
}





module.exports = {
    getOrders,
    addOrder,
    updateOrderByMyseller,
    updateOrderByTrade,
    addOrders,
    getNosByMyType,
    updateOrdersByMyseller,
    getTradeIdsByMytype,
    getOrdersByMytype3,
    getTradeIdsByMytype3to4,
    getFirstOrder
}