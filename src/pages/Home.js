import React, { useState, useRef, useEffect,useCallback } from 'react';
import { Row, Col,Table,Space,Tabs,List, notification, message, Button,DatePicker   } from 'antd';
import moment from 'moment';
import axios from 'axios';
const url = "http://dq.51apper.com"
const { TabPane } = Tabs;

const { RangePicker } = DatePicker;

const Home = () => {
  const [user,setUser] = useState();
  const [size, setSize] = useState({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
  })
  const [afterLog, setAfterLog] = useState([]);
  const [deliveryLog, setDeliveryLog] = useState([]);
  const [remarkLog, setRemarkLog] = useState([]);
  const [shopGeting,setShopGeting]=useState({})
  const [isLogin,setIsLogin] = useState(false);
  const [orderLog, setOrderLog] = useState([]);
  const [shopSource,setShopSource] = useState([]);
  const [sureShopNames,setSureShopNames] = useState([]); //允许登录的店铺(授权店铺)
  const [dateTimes,setDateTimes] = useState([moment().subtract('days', 6).format('YYYY-MM-DD')+" 00:00:00", moment(Date.now()).format('YYYY-MM-DD')+" 23:59:59"]);// 日期时间
  const [isGet, setIsGet] = useState(false);
  let shopCallBack = useRef()
  let shopTimer= null;
  let getTimer = null;

  const onResize = useCallback(() => {
    if(document.documentElement.clientHeight == size.height) return;
    setSize({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight
    })
  }, [])

  const checkShop = async()=>{
    // 定时获取店铺信息
    const shops = await window.hklocalstorage.getShops()
    shops.forEach(shop => {
      if(!shop.isOnline){
        shopGeting[shop.id] = false 
        setShopGeting({...shopGeting})
        getTimer && clearInterval(getTimer)
      }
    });
    shops && setShopSource(shops)
    // 定时获取店铺日志
    const {orderlogs,memologs,fahuoLogs} = await window.hklocalstorage.getShopLog()
    orderlogs && setOrderLog(orderlogs)
    memologs && setRemarkLog(memologs)
    fahuoLogs && setDeliveryLog(fahuoLogs)
  }

  const requestInit = async()=>{
    const user = JSON.parse(localStorage.getItem("user"));
    if(!user){
        window.location.href = "#/login";
        return;
    }
    setUser(user)
    setIsLogin(true)
    let shopNames = [];
    user.shops.forEach(shop => {
      shopNames = [...shopNames,{name:shop.name,id:shop.id}]
    });
    setSureShopNames(shopNames)
    shopCallBack.current = checkShop
    shopTimer = setInterval(() => {
      shopCallBack.current()
    }, 2000);
  }

  useEffect(() => {
    requestInit()
    window.addEventListener('resize', onResize);
    return ()=>{
      window.removeEventListener('resize', onResize)
      shopTimer && clearInterval(shopTimer)
      getTimer && clearInterval(getTimer)
    }
  }, []);

  const shopDel = async(shopName)=>{
    await window.hklocalstorage.delShop(shopName)
  }

  // 获取订单
  const getOrderClick = async(id,shopName)=>{

    shopGeting[id] = true 
    setShopGeting({...shopGeting})

    // 获取订单
    await getOrderInfo(id,shopName)
    // 插入备注 
    await insertMemo(id,shopName)
    // 发货
    await fahuoinsert(id,shopName)

    getTimer = setInterval(async() => {
      await getOrderInfo(id,shopName)
      await insertMemo(id,shopName)
      await fahuoinsert(id,shopName)
    }, 1000*60*15);

  }

  const fahuoinsert = async(shopId,shopName)=>{
    let res = await axios.get(`${url}/api/order/expressdelivery?shop_id=${shopId}`,{
      headers: {
          'token': user.token
      }
    })
    if(res.data.code != 1){
      return message.error("没有发货数据")
    }
    const resOrders = res.data.data;
    if (resOrders.length == 0){
      return message.error("没有发货数据")
    }
    let express = {}
    let noArr = []
    resOrders.forEach(resOrder => {
      express[resOrder.order] = {express:resOrder.expressno,type:resOrder.expresstype}
      noArr = [...noArr,resOrder.order]
    });
    console.log(express)
    let data ={shopName,express}
    res= await window.taobao.taobaofahuoinsert(data)
    if(res.code == 1){
      const re = await axios.post(`${url}/api/order/expressdeliverydel`,{orders:noArr},{
        headers: {
            'token': user.token
        }
      })
      if(re.data.code != 1){
        return message.error("发货失败")
      }
    }
  }
  const insertMemo = async(shopId,shopName)=>{
    const res = await axios.get(`${url}/api/order/needmemo?shop_id=${shopId}`,{
      headers: {
          'token': user.token
      }
    })
    if(res.data.code != 1){
      return message.error("获取备注失败");
    }
    const resOrders = res.data.data;
    if (resOrders.length == 0){
      return message.success("没有备注信息");
    }
    const orderDic ={}
    let noArr = []
    resOrders.forEach(resOrder => {
      orderDic[resOrder.order] = resOrder.sellermemo
      noArr = [...noArr,resOrder.order]
    });
    const memoRes = await window.taobao.sellerMemoorderInsert({shopName,memoDic:orderDic})
    if(memoRes.code == 1){
      const needMemoRes = await axios.post(`${url}/api/order/needmemodel`,{orders:noArr},{
        headers: {
            'token': user.token
        }
      })
      if(needMemoRes.data.code != 1){
        return message.error("设置备注失败")
      }
    }
  }

  const getOrderInfo = async(id,shopName)=>{
     // 获取此店铺最新订单(按照支付时间排序)
     const orderRes = await axios.get(`${url}/api/order/paynew?shop_id=${id}`,{
      headers: {
          'token': user.token
      }
    })
    if(!orderRes || orderRes.data.code !== 1){
      message.error("获取订单失败")
      return
    }
    const paytime = orderRes.data.data.paytime
    // const paytime = "2022-03-20 21:30:10"
    const cainaoOrdersRes= await window.taobao.order({id,shopName,paytime})
    if(cainaoOrdersRes.code !=1){
      return message.error("获取订单失败")
    }
    let cainaoOrders = cainaoOrdersRes.data
    // 处理订单
    let dealOrders = []
    cainaoOrders.forEach(cainaoOrder => {
      let {no,buyer,buye_meom,user_memo,amount,total_fee,pay_time,products,addr}=cainaoOrder
      let tmpProducts = []
      products.forEach(product => {
        let {goods_name,img_path,total_fee,sku,amount,id} = product
        tmpProducts = [...tmpProducts,{
          order:no,outerid:"",refund:"NO_REFUND",state:1,
          sellnick:shopName,num:amount,title:goods_name,picpath:img_path,numid:id,
          totalfee:total_fee,skuname:sku,
        }]
      });
      total_fee = total_fee.replace(/¥/g, "")
      addr = addr.replace(/, /g,",").replace(/，/g,",")
      let cityArr = addr.split(" ")[0]
      var reg = /.+?(省|市|自治区|自治州|县|区)/g;
      let procityCounty = cityArr.match(reg)
      let province = procityCounty[0]
      let city = procityCounty[1]?procityCounty[1]:""
      let district = procityCounty[2]?procityCounty[2]:""
      let arr = addr.split(",")
      let mobilephone = arr[arr.length-1]
      let name = arr[arr.length-2]
      let post = arr[arr.length-3]
      let add = addr.replace(`,${post},${name},${mobilephone}`,"")
      
      let tmpAddress = {addr:add,adr:add,province,city,district,town:"",
      mobilephone,name,post,
      }

      const tmpOrder = {buyerid:buyer,tstatus:"WAIT_SELLER_SEND_GOODS",buyermemo:buye_meom,
                  sellerflag:0,nick:shopName,totolfee:total_fee,shop_id:id,order:no,orderstatus:1,
                  paytime:pay_time,sellermemo:user_memo,amount,products:tmpProducts,address:tmpAddress,
                }
      dealOrders = [...dealOrders,tmpOrder]
    });
    const res = await axios.post(`${url}/api/order/insertorder?shop_id=${id}`,{orders:dealOrders},{
      headers: {
          'token': user.token
      }
    })
    if(res.data.code == 1){
      message.success("上传成功")
    }else {
      message.error("上传失败")
    }
    return;
  }

  const columns = [
    {title: '来源店铺',dataIndex: 'name',key: 'name', },
    {title: '状态',dataIndex: 'isOnline',key: 'isOnline',
      render: isOnline => {  if(isOnline){    return "在线"  }  return "下线"},
    },
    {title: '店铺类型',dataIndex: 'type',key: 'type', },
    {title: '更新时间',dataIndex: 'updateAt',key: 'updateAt', },
    {title: '操作',key: 'action',
      render: (text, record) => (
        <Space size="middle">
          {/* <Button type="link"  disabled={!record.isOnline || shopGeting[record.id]} onClick={async()=> await getOrderClick(record.id,record.name)}>获取</Button> */}
          <Button type="link" disabled={record.isOnline} onClick={taobaoLogin}>登录</Button>
          {/* <Button type="link" onClick={async()=> await shopDel(record.name)}>删除</Button> */}
        </Space>
      ),
    },
  ];

  function callback(key) {
    console.log(key);
  }
  if (!isLogin){
    return null
  }

  const restartClick = async()=>{
    await window.system.restart()
  }

  const taobaoLogin = async()=>{
    if(sureShopNames.length === 0){
      message.error("无授权店铺")
      return
    }
    const isSuccess =  await window.taobao.login(sureShopNames)
    if(isSuccess){
      message.success("店铺登录成功");
    }else{
      message.error("店铺登录失败");
    }
  }

  const contactClick = async()=>{
    notification.open({
      message: '添加微信',
      description:
        '微信号：1234687945564',
      onClick: () => {
      },
    });
  }

  const logoutClick = async()=>{
    localStorage.removeItem("user")
    window.location.href = "#/login"
  }

  const goDownClick = async()=>{
    console.log("去拍单")
    await window.plant.open(`http://dqweb.51apper.com/#/login?token=${user.token}`)
  }


  const deliveryFunc = async(shopId,shopName,deliveryLog)=>{
    // let data = {
    //   shopName:"艾芙俪玟家居",
    //   express:{"2521913437614256405":{"express":"2198686840252","type":"邮政"}}
    // }
    deliveryLog = [...deliveryLog,{title:(new Date()).toLocaleString()+" 开始发货"}]
    setDeliveryLog(deliveryLog)
    let res = await axios.get(`${url}/api/order/expressdelivery?shop_id=${shopId}`,{
      headers: {
          'token': user.token
      }
    })
    if(res.data.code != 1){
      deliveryLog = [...deliveryLog,{title:(new Date()).toLocaleString()+" 没有发货数据"}]
      setDeliveryLog(deliveryLog)
      return deliveryLog;
    }
    const resOrders = res.data.data;
    if (resOrders.length == 0){
      deliveryLog = [...deliveryLog,{title:(new Date()).toLocaleString()+" 没有发货数据"}]
      setDeliveryLog(deliveryLog)
      return deliveryLog;
    }

    let express = {}
    let noArr = []
    resOrders.forEach(resOrder => {
      express[resOrder.order] = {express:resOrder.expressno,type:resOrder.expresstype}
      noArr = [...noArr,resOrder.order]
    });
    let data ={shopName,express}
    res= await window.taobao.taobaofahuoinsert(data)
    console.log(res)
    if(res.code !=0){
      deliveryLog = [...deliveryLog,{title:(new Date()).toLocaleString()+" 同步失败"}]
      setDeliveryLog(deliveryLog)
      return deliveryLog
    }
    deliveryLog = [...deliveryLog,{title:(new Date()).toLocaleString()+` 同步了${resOrders.length}条`}]
    setDeliveryLog(deliveryLog)
    const re = await axios.post(`${url}/api/order/expressdeliverydel`,{orders:noArr},{
      headers: {
          'token': user.token
      }
    })
    console.log(re)
    return deliveryLog
  }



  const remarkLogFunc = async(shopId,shopName,remarkLog)=>{
    remarkLog = [...remarkLog,{title:(new Date()).toLocaleString()+" 开始设置备注"}]
    setRemarkLog(remarkLog)
    const res = await axios.get(`${url}/api/order/needmemo?shop_id=${shopId}`,{
      headers: {
          'token': user.token
      }
    })
    if(res.data.code != 1){
      remarkLog = [...remarkLog,{title:(new Date()).toLocaleString()+" 没有备注"}]
      setRemarkLog(remarkLog)
      return remarkLog;
    }
    const resOrders = res.data.data;
    if (resOrders.length == 0){
      remarkLog = [...remarkLog,{title:(new Date()).toLocaleString()+" 没有备注"}]
      setRemarkLog(remarkLog)
      return remarkLog;
    }
    let noArr = []
    const orderDic ={}
    resOrders.forEach(resOrder => {
      orderDic[resOrder.order] = resOrder.sellermemo
      noArr = [...noArr,resOrder.order]
    });
    const orderInsertres = await window.taobao.sellerMemoorderInsert({shopName,memoDic:orderDic})
    if(orderInsertres.code !=0){
      remarkLog = [...remarkLog,{title:(new Date()).toLocaleString()+" 同步失败"}]
      setRemarkLog(remarkLog)
      return remarkLog
    }
    remarkLog = [...remarkLog,{title:(new Date()).toLocaleString()+` 同步了${resOrders.length}条`}]
    setRemarkLog(remarkLog)

    await axios.post(`${url}/api/order/needmemodel`,{orders:noArr},{
      headers: {
          'token': user.token
      }
    })

    return remarkLog
  }

  return (
  <div>
    <p style={{height:"20px"}}>欢迎：{user.nickname}</p>
    <Row justify="start" style={{height:"20px",marginBottom:"20px"}}>
      <Col span={4}><a onClick={taobaoLogin}>登录店铺</a></Col>
      <Col span={4}><a onClick={restartClick}>重启程序</a></Col>
      <Col span={4}><a onClick={goDownClick}>去拍单</a></Col>
      <Col span={4}><a onClick={contactClick}>联系方式</a></Col>
      <Col span={4}><a onClick={logoutClick}>退出登录</a></Col>
    </Row>
    <Row gutter={30}>
      <Col span={12}>
        <div>
        <RangePicker
          placeholder={["开始时间","结束时间"]}
          showTime
          defaultValue={[moment(dateTimes[0], "YYYY-MM-DD H:mm:ss"),moment(dateTimes[1], "YYYY-MM-DD HH:mm:ss")]}
          onChange={(dates, dateStrings)=>{
            setDateTimes(dateStrings)
          }}
        />
        <Button type="link" disabled={isGet} onClick={()=>{
          if(dateTimes.length == 0){
            return message.error("日期不为空")
          }
          if(shopSource.length == 0){
            return message.error("没有店铺")
          }
          setIsGet(true)
          window.taobao.getAll({dateTimes,token:user.token,shops:shopSource})
        }} >获取</Button>
        <Button type="link" onClick={()=>{
          setIsGet(false)
        }} >取消获取</Button>
        </div>
        <br/>
        <Table bordered dataSource={shopSource} columns={columns} pagination={false} />
      </Col>
      <Col span={12}>
        <Tabs defaultActiveKey="1" onChange={callback}>
          <TabPane tab="获取订单记录" key="1">
          <div style={{height:`${size.height-160}px`,overflow:"hidden auto"}}>
            <List

              key="1"
              itemLayout="horizontal"
              dataSource={orderLog}
              renderItem={(item,i) => (
                <List.Item key={i}>
                    {item.title}
                </List.Item>
              )}
            />
          </div>
          </TabPane>
          <TabPane tab="备注记录" key="2">
          <div style={{height:`${size.height-160}px`,overflow:"hidden auto"}}>
            <List
              key="2"
              itemLayout="horizontal"
              dataSource={remarkLog}
              renderItem={(item,i) => (
                <List.Item key={i}>
                    {item.title}
                </List.Item>
              )}
            />
          </div>
          </TabPane>
          <TabPane tab="发货记录" key="3">
          <div style={{height:`${size.height-160}px`,overflow:"hidden auto"}}>
            <List
              key="3"
              itemLayout="horizontal"
              dataSource={deliveryLog}
              renderItem={(item,i) => (
                <List.Item key={i}>
                    {item.title}
                </List.Item>
              )}
            />
            </div>
          </TabPane>
          <TabPane tab="退货退款记录" key="4">
          <div style={{height:`${size.height-160}px`,overflow:"hidden auto"}}>
          <List
            key="4"
            itemLayout="horizontal"
            dataSource={afterLog}
            renderItem={(item,i) => (
              <List.Item key={i}>
                  {item.title}
              </List.Item>
            )}
            />
            </div>
          </TabPane>
        </Tabs>
      </Col>
    </Row>

  </div>
  )
  
};

export default Home;