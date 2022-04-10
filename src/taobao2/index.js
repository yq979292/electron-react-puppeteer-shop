const { login } = require("./login");
const { mysellConsign } = require("./mysellConsign");
const { isBig } = require("./compareDate");
const { memoinsert } = require("./memoinsert");
const { fahuoinsert } = require("./fahuoinsert");
const {addLog} = require('./log')
const {test} = require('./test')
const {fahuo} = require('./fahuo')
const {trade} = require('./trade')

module.exports = {
  login,mysellConsign,isBig,memoinsert,fahuoinsert,addLog,test,fahuo,trade
}