import React, { useState, useRef, useEffect } from 'react';
import { Row, Col,Table,Space,Tabs,List   } from 'antd';


const Contact = () => {

  return (
    <div>
    <Row justify="start">
      <Col span={4}><a style={{textDecoration:"none"}} href="/">返回首页</a></Col>
    </Row>
      <h1>
      微信：1234567892
      </h1>
    </div>
  )
  
};

export default Contact;