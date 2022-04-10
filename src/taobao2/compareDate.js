
// 是否大于
const isBig = (time1,time2)=>{
  var timestamp1 = Date.parse(new Date(time1));
  var timestamp2 = Date.parse(new Date(time2));
  return timestamp1>timestamp2
}

module.exports = {isBig}
