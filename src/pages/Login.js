import React from 'react';
import { Form, Input, Button, Checkbox, message } from 'antd';
import axios from 'axios';
const url = "http://dq.51apper.com"
const Login = () => {
  const onFinish = async(values) => {
    const user = await axios.post(`${url}/api/user/login`,{...values})
    if(user.data.code != 1){
      message.error("账号密码错误")
      return 
    }
    message.success("登录成功")
    localStorage.setItem("user",JSON.stringify(user.data.data.userinfo))
    window.location.href = "#/"
  };

  return (
   <div>
     <h1>登录界面</h1>
     <Form
      name="basic"

      initialValues={{
        account: "yangyang",
        password:"yangyang",
      }}
      onFinish={onFinish}
      autoComplete="off"
    >
      <Form.Item
        label="用户名"
        name="account"
        rules={[
          {
            required: true,
            message: '用户名',
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="密码"
        name="password"
        rules={[
          {
            required: true,
            message: '密码',
          },
        ]}
      >
        <Input.Password />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          登录
        </Button>
      </Form.Item>
    </Form>
   </div>
  );
};

export default Login;